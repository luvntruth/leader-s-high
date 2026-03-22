# TODOS

## Phase 2 준비

### Vitest + React Testing Library 도입
- **What:** 테스트 프레임워크 설정 + 결제 로직 단위 테스트
- **Why:** Phase 2에서 사용자 확대 시 결제 버그는 치명적. 10명 검증 단계에서는 수동 테스트로 충분하지만, 확대 시 자동화 필수.
- **Context:** Vite 프로젝트이므로 Vitest가 자연스러운 선택. paymentService의 결제 분기 (성공/실패/취소), report_purchases INSERT, simulation_history feedback UPDATE가 핵심 테스트 대상.
- **Depends on:** Phase 1 완료 후
