
# Letmefree (렛미프리) - AI 리더십 시뮬레이터

최고의 리더는 본능이 아닌 '전략'으로 대화합니다. **Letmefree**는 Gemini 2.5 Live API를 활용하여 실제 팀원과의 대화 상황을 시뮬레이션하고, 심리학 및 리더십 이론에 근거한 정밀 피드백을 제공하는 AI 훈련 플랫폼입니다.

## 🚀 주요 기능

- **실시간 음성 시뮬레이션**: Gemini Live API를 통해 실제 팀원과 대화하듯 음성으로 면담 훈련을 진행합니다.
- **이론 기반 미션 가이드**: SBI 피드백 모델, 자기결정성 이론 등 경영학/심리학 이론에 근거한 전략적 미션을 제공합니다.
- **AI 정밀 진단**: 대화 종료 후 리더의 강점과 개선점, 모범 답안을 포함한 심층 리포트를 생성합니다.
- **커스텀 랩**: 현재 직면한 실제 고민 상황을 입력하여 나만의 훈련 시나리오를 설계할 수 있습니다.

## 🛠 로컬 실행 방법

이 프로젝트를 로컬 환경에서 실행하려면 아래 단계를 따르세요.

### 1. 필수 조건
- [Node.js](https://nodejs.org/) (LTS 버전 권장)
- [Gemini API Key](https://aistudio.google.com/app/apikey)

### 2. 저장소 복제 및 패키지 설치
```bash
# 패키지 설치
npm install
```

### 3. 환경 변수 설정
프로젝트 최상위 폴더에 `.env` 파일을 생성하고 본인의 API 키를 입력합니다.
**※ 주의: .env 파일은 절대 GitHub에 업로드하지 마세요! (현재 .gitignore에 포함되어 있습니다)**

```env
API_KEY=여러분의_제미나이_API_키
```

### 4. 개발 서버 실행
```bash
npm run dev
```
서버가 시작되면 브라우저에서 `http://localhost:3000`으로 접속하세요.

## 📦 기술 스택
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **AI**: Google Gemini API (@google/genai)
- **Routing**: React Router 7

## ⚠️ 주의사항
- 실시간 음성 기능을 사용하려면 브라우저의 마이크 권한 허용이 필요합니다.
- Gemini Live API 호출 시 할당량(Quota) 초과 에러가 발생할 수 있습니다. (429 에러 발생 시 잠시 후 다시 시도)
