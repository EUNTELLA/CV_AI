const fs = require('fs');
const ort = require('onnxruntime-web');

async function run() {
  ort.env.wasm.numThreads = 1;
  const sessScooter = await ort.InferenceSession.create(
    fs.readFileSync('public/models/hybrid-v1/scooter_detection.onnx')
  );
  const sessBraille = await ort.InferenceSession.create(
    fs.readFileSync('public/models/hybrid-v1/braille_segmentation.onnx')
  );
  console.log('Sessions created successfully!');

  // Test with a dummy input
  const inputTensor = new ort.Tensor(
    'float32',
    new Float32Array(1 * 3 * 640 * 640),
    [1, 3, 640, 640]
  );
  const outS = await sessScooter.run({ images: inputTensor });
  const outB = await sessBraille.run({ images: inputTensor });
  console.log('Dummy run successful:', {
    scooterOutputDims: outS.output0.dims,
    brailleOutput0Dims: outB.output0.dims,
    brailleOutput1Dims: outB.output1.dims,
  });
}

run().catch(console.error);
