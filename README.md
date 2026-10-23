# Safe Parking AI — 공유 킥보드 점자블록 안전 반납 비전 AI 웹

> **모두를 위한 안전한 보행 환경**  
> 시각장애인의 보행권을 위협하는 공유 킥보드 점자블록 무단 방치를 TensorFlow.js 온디바이스 딥러닝 비전 AI로 실시간 판정하고 안전 반납을 유도하는 웹 애플리케이션입니다.

---

## 🚀 프로젝트 개요

전동 킥보드(PM, 개인형 이동장치) 이용 후 무분별하게 점자블록 위나 유도선 주변에 반납하여 발생하는 시각장애인 낙상 사고를 방지하기 위해 기획되었습니다. 사용자가 반납 사진을 촬영하면, 기기 브라우저 내부에서 작동하는 **TensorFlow.js GraphModel**이 점자블록 침범 여부를 분석하여 안전 주차 시에만 반납을 허용합니다.

---

## 🛠️ 기술 스택

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React Icons, Pretendard Font
- **AI & Computer Vision**: TensorFlow.js (`@tensorflow/tfjs`) — GraphModel 온디바이스 추론
- **Deployment**: Vercel Ready (`vercel.json`), GitHub

---

## 🧠 AI 모델 아키텍처 및 연동 스펙

| 항목 | 상세 스펙 |
| :--- | :--- |
| **모델 유형** | TensorFlow.js GraphModel (`format: "graph-model"`) |
| **모델 경로** | `/model/model.json` (가중치: `/model/group1-shard1of1.bin`) |
| **로드 방식** | `tf.loadGraphModel('/model/model.json')` |
| **입력 형태** | `[1, 224, 224, 3]` (Batch, Height, Width, RGB Channels) |
| **입력 자료형** | `float32`, 픽셀 값 범위 `0 ~ 255` |
| **정규화** | 모델 내부 `RealDiv` 노드에 정규화(`÷ 255.0`) 포함 (JS에서 재정규화 불필요) |
| **출력 클래스** | `[Blocked, Near, Safe]` (Softmax 확률 벡터) |
| **메모리 관리** | 추론 전후 `tf.tidy()` 및 명시적 `tensor.dispose()`로 메모리 누수 방지 |

### 결과 판정 기준

$$\text{Risk 확률} = \text{Blocked 확률} + \text{Near 확률}$$

1. **위험 상태 (`BLOCKED`)**: $\text{Risk} \ge 0.5$ (50% 이상)
   - 🔴 **빨간색 경고 카드** 표시
   - 반납 버튼 **비활성화** (반납 차단)
   - 안전 구역으로 킥보드 이동 후 재촬영 안내
2. **정상 상태 (`SAFE`)**: $\text{Safe} \ge 0.8$ (80% 이상)
   - 🟢 **초록색 정상 카드** 표시
   - 시연용 반납 버튼 **활성화**
   - 가상 반납 완료 영수증 및 매너 마일리지 제공
3. **확인 필요 (`UNCLEAR`)**: 위 기준 미충족 시 (경계 영역)
   - 🟡 **노란색 주의 카드** 표시
   - 반납 버튼 **비활성화**
   - 조명/각도 조정 후 재촬영 요청

> ※ 위 임계값은 초기 시연 설정이며, 실제 안전을 법적으로 보증하는 기준이 아닙니다.  
> ※ Safe Parking AI는 모델 부재 또는 로딩 실패 시 가짜 Mock 데이터를 일체 표시하지 않고 명확한 에러를 안내합니다.

---

## 📱 주요 기능

1. **온디바이스 카메라 촬영 & 앨범 업로드**:
   - 모바일 후면 카메라(`environment`) 지원 실시간 뷰파인더 모달
   - PC/모바일 파일 탐색기 드래그 & 드롭 및 앨범 사진 선택
2. **실시간 원클릭 시연 샘플 4종**:
   - `안전 구역 주차 (Safe)`: 전용 주차 거치대 정상 반납
   - `점자블록 침범 (Blocked)`: 노란색 점자블록 위 직접 거치
   - `점자블록 인근 (Near)`: 보행 유도 블록 30cm 이내 근접
   - `야간/흐림 (Unclear)`: 저조도 식별 불명확 재촬영 유도
3. **TensorFlow.js 딥러닝 추론 & 클래스별 확률 그래프**:
   - Blocked / Near / Safe 3단계 시각화 막대 그래프
   - 추론 소요 시간(ms) 실시간 표시
4. **시연용 반납 완료 영수증 모달**:
   - 안전 점수 및 매너 마일리지 시연 카드
5. **점자블록 안전 주차 가이드**:
   - 점형 블록(정지/주의) vs 선형 블록(방향 유도) 해설
   - 5대 절대 주차 금지 구역 및 권장 주차 구역 인포그래픽
6. **보안 및 개인정보 보호**:
   - 촬영된 사진은 서버로 전송되지 않으며, 사용자 기기 브라우저 내부에서만 안전하게 연산됩니다.

---

## 💻 로컬 실행 방법

### 1. 패키지 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:5173` 접속

### 3. AI 모델 재검증 및 빌드
```bash
# 모델 생성 및 가중치 검증 스크립트 실행
node scripts/generate_model.cjs

# 시연용 샘플 이미지 생성
node scripts/create_sample_images.cjs

# 프로덕션 빌드 테스트
npm run build
```

---

## 🌐 GitHub & Vercel 배포 가이드

### Vercel 원클릭 배포
1. 저장소를 GitHub에 푸시합니다.
2. Vercel 대시보드에서 `Add New Project` ➔ 해당 저장소를 선택합니다.
3. Framework Preset: **Vite** 선택
4. `vercel.json` 파일에 `/model/*` 캐시 및 라우팅 설정이 사전 구성되어 있으므로 별도 설정 없이 배포 완료됩니다.

---

## 📄 라이선스
MIT License — 학술 및 시연 목적 프로토타입 프로젝트입니다.
# CV_AI
