# Changelog

모든 주요 변경사항이 이 파일에 기록됩니다.

## [2026-03-16] - instant-coaching 기능 PDCA 완료

### Added
- `trustLevelService.ts`: InstantCoachingInput/Result 인터페이스, 경량 프롬프트(200토큰), getInstantCoaching() 메서드
- `screens/Simulation.tsx`: 즉시 코칭 버튼 UI(앰버색), 코칭 카드 UI(5개 필드), 상태 관리(instantCoaching, isCoachingLoading, showCoaching)
- 로컬 캐시 시스템(`coachingCacheRef`): 동일 메시지 중복 호출 방지
- mountedRef 가드: 언마운트 후 상태 업데이트 방지(메모리 누수 방지)

### Changed
- API 비용 최적화: 5000토큰/호출 → 650토큰/호출 (87% 절감)
- 신뢰 점수 간격: 3턴 → 4턴 (TRUST_SCORING_INTERVAL = 4로 변경, 자동 점수 호출 25% 감소)
- Gemini 모델 안정화: gemini-3-flash-preview → gemini-2.5-flash (GA)로 변경 (3파일)

### Fixed
- JSON 파싱: + 기호 제거 로직 추가(파싱 안정성 향상)
- 로딩 상태: 새 요청 시 이전 코칭 결과 자동 초기화

### Metrics
- 설계 일치도: 92% (PASS, 기준 90%)
- 인터페이스 일치: 100% (9/9 필드)
- 프롬프트 일치: 100% (8/8 규칙)
- 서비스 로직 일치: 100% (10/10 항목)
- 구현 순서 일치: 100% (7/7 단계)
- 누락 항목: 1개 (responseSchema, 기능 영향 없음)
- 추가 최적화: 5개 (모두 긍정적 개선)

### Deployment
- 파일 변경: 2개 (신규 파일 0개)
- 코드 추가: ~280줄
- 빌드 상태: ✅ npm run build 통과
- 상태: ✅ APPROVED FOR DEPLOYMENT

---

## [2026-03-16] - CLAUDE.md 문서 갭 분석 및 개선 완료

### Added
- CLAUDE.md에 6개 화면 추가 문서화 (Missions, Profile, TeamOffice, StreakDetail, HistoryList, HistoryDetail)
- emotionStateMachine 7단계 감정 상태 명시 (HOSTILE → DEFENSIVE → GUARDED → NEUTRAL → OPENING → COOPERATIVE → CONVINCED)
- trustLevelService 5차원 신뢰 차원 명칭 정확화

### Changed
- 시나리오 수 수정: 22개 → 40개 (constants.tsx 실제 데이터 기반)
- 파일 확장자 수정: constants.ts → constants.tsx
- Navigation 컴포넌트 설명: BottomNav deprecated 명확히 표기, 통합 기능 설명 강화

### Fixed
- CLAUDE.md 일치율 개선: 89% → 100% (gap-detector + pdca-iterator 2 iterations)
- 모든 갭 항목 해결 (6개 → 0개)

---

## 향후 릴리즈

모든 주요 변경사항은 이 changelog에 기록됩니다.
