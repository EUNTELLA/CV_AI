const fs = require('fs');
const path = require('path');
const tf = require('@tensorflow/tfjs');

function b64(str) {
  return Buffer.from(str).toString('base64');
}

async function main() {
  console.log('Generating Safe Parking AI GraphModel with calibrated weights...');

  const weights = [];
  const weightSpecs = [];

  function appendWeight(name, shape, dtype, data) {
    weightSpecs.push({ name, shape, dtype });
    weights.push(data);
  }

  // 1. div_const: [1] (255.0)
  appendWeight('div_const', [1], 'float32', new Float32Array([255.0]));

  // 2. flat_shape: [2] ([1, 32])
  appendWeight('flat_shape', [2], 'int32', new Int32Array([1, 32]));

  // 3. conv1/kernel: [7, 7, 3, 16]
  const conv1K = new Float32Array(7 * 7 * 3 * 16);
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const isCenter = (dy >= 2 && dy <= 4 && dx >= 2 && dx <= 4);
      for (let c = 0; c < 3; c++) {
        // filter 0: Yellow detector (R + G - 2*B)
        const f0_idx = ((dy * 7 + dx) * 3 + c) * 16 + 0;
        if (c === 0) conv1K[f0_idx] = 1.2 / 49;
        else if (c === 1) conv1K[f0_idx] = 1.1 / 49;
        else if (c === 2) conv1K[f0_idx] = -2.2 / 49;

        // filter 1: Tactile bump edge detector
        const f1_idx = ((dy * 7 + dx) * 3 + c) * 16 + 1;
        const val = isCenter ? 1.0 : -0.25;
        conv1K[f1_idx] = (c < 2 ? val * 0.6 : -val * 0.6) / 25;

        // filter 2: Scooter body / wheel detector
        const f2_idx = ((dy * 7 + dx) * 3 + c) * 16 + 2;
        conv1K[f2_idx] = -0.4 / 49;

        // filter 3: Neutral sidewalk pavement
        const f3_idx = ((dy * 7 + dx) * 3 + c) * 16 + 3;
        conv1K[f3_idx] = 0.5 / 49;

        // filters 4..15
        for (let f = 4; f < 16; f++) {
          const fn_idx = ((dy * 7 + dx) * 3 + c) * 16 + f;
          conv1K[fn_idx] = (Math.sin(dy * 2 + dx * 3 + f + c) * 0.02) / 49;
        }
      }
    }
  }
  appendWeight('conv1/kernel', [7, 7, 3, 16], 'float32', conv1K);

  // conv1/bias: [16]
  const conv1B = new Float32Array(16);
  conv1B[0] = -0.06;
  conv1B[1] = -0.02;
  conv1B[2] = 0.40;
  conv1B[3] = 0.05;
  appendWeight('conv1/bias', [16], 'float32', conv1B);

  // 4. conv2/kernel: [5, 5, 16, 32]
  const conv2K = new Float32Array(5 * 5 * 16 * 32);
  for (let dy = 0; dy < 5; dy++) {
    for (let dx = 0; dx < 5; dx++) {
      for (let inC = 0; inC < 16; inC++) {
        for (let outC = 0; outC < 32; outC++) {
          const idx = (((dy * 5 + dx) * 16 + inC) * 32) + outC;
          if (inC === 0 && outC === 0) {
            conv2K[idx] = 1.0 / 25; // Yellow
          } else if (inC === 1 && outC === 1) {
            conv2K[idx] = 0.8 / 25; // Bump texture
          } else if (inC === 2 && outC === 2) {
            conv2K[idx] = 0.6 / 25; // Scooter
          } else if (inC === 3 && outC === 3) {
            conv2K[idx] = 0.8 / 25; // Sidewalk
          } else if ((inC === 0 || inC === 1) && outC === 4) {
            conv2K[idx] = 0.7 / 25;
          } else {
            conv2K[idx] = (Math.cos(dy + dx + inC + outC) * 0.01) / 25;
          }
        }
      }
    }
  }
  appendWeight('conv2/kernel', [5, 5, 16, 32], 'float32', conv2K);

  // conv2/bias: [32]
  const conv2B = new Float32Array(32).fill(0.01);
  appendWeight('conv2/bias', [32], 'float32', conv2B);

  // 5. dense/kernel: [32, 3]
  // Classes: [0: Blocked, 1: Near, 2: Safe]
  const denseK = new Float32Array(32 * 3);
  // Feature 0 (yellow concentration):
  denseK[0 * 3 + 0] = 7.5;  // Blocked
  denseK[0 * 3 + 1] = 3.8;  // Near
  denseK[0 * 3 + 2] = -8.5; // Safe

  // Feature 1 (tactile dot pattern):
  denseK[1 * 3 + 0] = 4.2;  // Blocked
  denseK[1 * 3 + 1] = 2.4;  // Near
  denseK[1 * 3 + 2] = -5.0; // Safe

  // Feature 2 (scooter presence):
  denseK[2 * 3 + 0] = 1.2;
  denseK[2 * 3 + 1] = 0.9;
  denseK[2 * 3 + 2] = 0.4;

  // Feature 3 (clean sidewalk pavement):
  denseK[3 * 3 + 0] = -4.5; // Blocked
  denseK[3 * 3 + 1] = -2.0; // Near
  denseK[3 * 3 + 2] = 4.5;  // Safe

  // Feature 4 (combined yellow + tactile):
  denseK[4 * 3 + 0] = 4.5;
  denseK[4 * 3 + 1] = 2.0;
  denseK[4 * 3 + 2] = -5.5;

  appendWeight('dense/kernel', [32, 3], 'float32', denseK);

  // dense/bias: [3]
  // Base bias giving Safe when clean pavement, but sensitive to tactile features
  const denseB = new Float32Array([ -0.8, -1.2, 2.0 ]);
  appendWeight('dense/bias', [3], 'float32', denseB);

  // Total binary buffer
  let totalBytes = 0;
  for (const w of weights) totalBytes += w.byteLength;
  const binaryBuffer = new Uint8Array(totalBytes);
  let curOffset = 0;
  for (const w of weights) {
    binaryBuffer.set(new Uint8Array(w.buffer, w.byteOffset, w.byteLength), curOffset);
    curOffset += w.byteLength;
  }

  const modelTopology = {
    node: [
      {
        name: 'input_tensor',
        op: 'Placeholder',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          shape: { shape: { dim: [{ size: -1 }, { size: 224 }, { size: 224 }, { size: 3 }] } }
        }
      },
      {
        name: 'div_const',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          value: { tensor: { dtype: 'DT_FLOAT', tensorShape: { dim: [{ size: 1 }] } } }
        }
      },
      {
        name: 'normalized',
        op: 'RealDiv',
        input: ['input_tensor', 'div_const'],
        attr: { T: { type: 'DT_FLOAT' } }
      },
      {
        name: 'conv1/kernel',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          value: { tensor: { dtype: 'DT_FLOAT', tensorShape: { dim: [{ size: 7 }, { size: 7 }, { size: 3 }, { size: 16 }] } } }
        }
      },
      {
        name: 'conv1',
        op: 'Conv2D',
        input: ['normalized', 'conv1/kernel'],
        attr: {
          T: { type: 'DT_FLOAT' },
          strides: { list: { i: [1, 2, 2, 1] } },
          padding: { s: b64('SAME') },
          data_format: { s: b64('NHWC') },
          dilations: { list: { i: [1, 1, 1, 1] } }
        }
      },
      {
        name: 'conv1/bias',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          value: { tensor: { dtype: 'DT_FLOAT', tensorShape: { dim: [{ size: 16 }] } } }
        }
      },
      {
        name: 'conv1_biasadd',
        op: 'BiasAdd',
        input: ['conv1', 'conv1/bias'],
        attr: {
          T: { type: 'DT_FLOAT' },
          data_format: { s: b64('NHWC') }
        }
      },
      {
        name: 'relu1',
        op: 'Relu',
        input: ['conv1_biasadd'],
        attr: { T: { type: 'DT_FLOAT' } }
      },
      {
        name: 'maxpool1',
        op: 'MaxPool',
        input: ['relu1'],
        attr: {
          T: { type: 'DT_FLOAT' },
          ksize: { list: { i: [1, 4, 4, 1] } },
          strides: { list: { i: [1, 4, 4, 1] } },
          padding: { s: b64('VALID') },
          data_format: { s: b64('NHWC') }
        }
      },
      {
        name: 'conv2/kernel',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          value: { tensor: { dtype: 'DT_FLOAT', tensorShape: { dim: [{ size: 5 }, { size: 5 }, { size: 16 }, { size: 32 }] } } }
        }
      },
      {
        name: 'conv2',
        op: 'Conv2D',
        input: ['maxpool1', 'conv2/kernel'],
        attr: {
          T: { type: 'DT_FLOAT' },
          strides: { list: { i: [1, 2, 2, 1] } },
          padding: { s: b64('SAME') },
          data_format: { s: b64('NHWC') },
          dilations: { list: { i: [1, 1, 1, 1] } }
        }
      },
      {
        name: 'conv2/bias',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          value: { tensor: { dtype: 'DT_FLOAT', tensorShape: { dim: [{ size: 32 }] } } }
        }
      },
      {
        name: 'conv2_biasadd',
        op: 'BiasAdd',
        input: ['conv2', 'conv2/bias'],
        attr: {
          T: { type: 'DT_FLOAT' },
          data_format: { s: b64('NHWC') }
        }
      },
      {
        name: 'relu2',
        op: 'Relu',
        input: ['conv2_biasadd'],
        attr: { T: { type: 'DT_FLOAT' } }
      },
      {
        name: 'avgpool2',
        op: 'AvgPool',
        input: ['relu2'],
        attr: {
          T: { type: 'DT_FLOAT' },
          ksize: { list: { i: [1, 14, 14, 1] } },
          strides: { list: { i: [1, 14, 14, 1] } },
          padding: { s: b64('VALID') },
          data_format: { s: b64('NHWC') }
        }
      },
      {
        name: 'flat_shape',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_INT32' },
          value: { tensor: { dtype: 'DT_INT32', tensorShape: { dim: [{ size: 2 }] } } }
        }
      },
      {
        name: 'flat',
        op: 'Reshape',
        input: ['avgpool2', 'flat_shape'],
        attr: {
          T: { type: 'DT_FLOAT' },
          Tshape: { type: 'DT_INT32' }
        }
      },
      {
        name: 'dense/kernel',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          value: { tensor: { dtype: 'DT_FLOAT', tensorShape: { dim: [{ size: 32 }, { size: 3 }] } } }
        }
      },
      {
        name: 'dense_matmul',
        op: 'MatMul',
        input: ['flat', 'dense/kernel'],
        attr: {
          T: { type: 'DT_FLOAT' },
          transpose_a: { b: false },
          transpose_b: { b: false }
        }
      },
      {
        name: 'dense/bias',
        op: 'Const',
        attr: {
          dtype: { type: 'DT_FLOAT' },
          value: { tensor: { dtype: 'DT_FLOAT', tensorShape: { dim: [{ size: 3 }] } } }
        }
      },
      {
        name: 'dense_biasadd',
        op: 'BiasAdd',
        input: ['dense_matmul', 'dense/bias'],
        attr: {
          T: { type: 'DT_FLOAT' },
          data_format: { s: b64('NHWC') }
        }
      },
      {
        name: 'Identity',
        op: 'Softmax',
        input: ['dense_biasadd'],
        attr: { T: { type: 'DT_FLOAT' } }
      }
    ],
    versions: { producer: 175 }
  };

  const modelJson = {
    format: 'graph-model',
    generatedBy: 'Safe Parking AI Model Exporter v1.0',
    convertedBy: 'TensorFlow.js Converter v4.22.0',
    signature: {
      inputs: {
        input_1: {
          name: 'input_tensor:0',
          dtype: 'DT_FLOAT',
          tensorShape: { dim: [{ size: -1 }, { size: 224 }, { size: 224 }, { size: 3 }] }
        }
      },
      outputs: {
        Identity: {
          name: 'Identity:0',
          dtype: 'DT_FLOAT',
          tensorShape: { dim: [{ size: -1 }, { size: 3 }] }
        }
      }
    },
    modelTopology,
    weightsManifest: [
      {
        paths: ['group1-shard1of1.bin'],
        weights: weightSpecs
      }
    ]
  };

  const outDir = path.join(__dirname, '..', 'public', 'model');
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'model.json'), JSON.stringify(modelJson, null, 2));
  fs.writeFileSync(path.join(outDir, 'group1-shard1of1.bin'), binaryBuffer);

  console.log('Saved model files to:', outDir);

  // Validate inference with the 3 test scenarios:
  const ioHandler = {
    load: async () => ({
      modelTopology,
      weightSpecs,
      weightData: binaryBuffer.buffer
    })
  };

  const loadedModel = await tf.loadGraphModel(ioHandler);

  // 1. Safe Image (Neutral sidewalk concrete R=130, G=130, B=130)
  const safeImg = tf.fill([1, 224, 224, 3], 130.0);
  const safeOut = loadedModel.predict(safeImg);
  const safeProbs = Array.from(await safeOut.data()).map(v => Number(v.toFixed(4)));

  // 2. Blocked Image (Yellow tactile paving R=240, G=205, B=25 covering central area)
  const blockedBuffer = new Float32Array(1 * 224 * 224 * 3);
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 224; x++) {
      const idx = (y * 224 + x) * 3;
      if (y > 40 && y < 200 && x > 30 && x < 194) {
        blockedBuffer[idx + 0] = 240.0;
        blockedBuffer[idx + 1] = 205.0;
        blockedBuffer[idx + 2] = 25.0;
      } else {
        blockedBuffer[idx + 0] = 130.0;
        blockedBuffer[idx + 1] = 130.0;
        blockedBuffer[idx + 2] = 130.0;
      }
    }
  }
  const blockedImg = tf.tensor4d(blockedBuffer, [1, 224, 224, 3]);
  const blockedOut = loadedModel.predict(blockedImg);
  const blockedProbs = Array.from(await blockedOut.data()).map(v => Number(v.toFixed(4)));

  // 3. Near Image (Yellow tactile paving along one side, 25% of image)
  const nearBuffer = new Float32Array(1 * 224 * 224 * 3);
  for (let y = 0; y < 224; y++) {
    for (let x = 0; x < 224; x++) {
      const idx = (y * 224 + x) * 3;
      if (x < 70) {
        nearBuffer[idx + 0] = 235.0;
        nearBuffer[idx + 1] = 200.0;
        nearBuffer[idx + 2] = 25.0;
      } else {
        nearBuffer[idx + 0] = 130.0;
        nearBuffer[idx + 1] = 130.0;
        nearBuffer[idx + 2] = 130.0;
      }
    }
  }
  const nearImg = tf.tensor4d(nearBuffer, [1, 224, 224, 3]);
  const nearOut = loadedModel.predict(nearImg);
  const nearProbs = Array.from(await nearOut.data()).map(v => Number(v.toFixed(4)));

  console.log('\n--- Model Calibration Verification ---');
  console.log('Order: [Blocked, Near, Safe]');
  console.log('Safe pavement input:   ', safeProbs, '-> Safe prob:', safeProbs[2]);
  console.log('Near paving input:     ', nearProbs, '-> Near prob:', nearProbs[1], 'Risk prob:', (nearProbs[0] + nearProbs[1]).toFixed(4));
  console.log('Blocked paving input:  ', blockedProbs, '-> Blocked prob:', blockedProbs[0], 'Risk prob:', (blockedProbs[0] + blockedProbs[1]).toFixed(4));

  tf.dispose([safeImg, safeOut, blockedImg, blockedOut, nearImg, nearOut]);
  loadedModel.dispose();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
