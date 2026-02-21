
import { Scenario, Generation } from './types';

export const CATEGORIES = [
  '전체', '성과 관리', '갈등 해결', '조직 문화', '피드백', '동기 부여', '변화 관리', '경력 개발'
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'late-comer',
    title: '성과 좋은 만성 지각자',
    category: '성과 관리',
    description: '팀의 핵심 개발자가 매일 30분씩 늦습니다. 실력은 최고라 다른 팀원들이 대놓고 불만을 말하지 못하지만, 조직 기강이 무너지는 게 눈에 보입니다. 오늘 아침 중요 주간 회의에도 20분 늦게 나타나 아무 일 없다는 듯 자리에 앉았습니다.',
    memberName: '김철수',
    generation: Generation.GEN_Z,
    intensity: 'medium',
    traits: { context: 20, driver: 40 }
  },
  {
    id: 'team-clash',
    title: '연상 팀원의 권위 무시',
    category: '갈등 해결',
    description: '리더보다 10살 많은 시니어 팀원이 당신의 업무 지시 때마다 "내가 예전에 다 해봤는데 안 되더라"며 회의 중 공개적으로 한숨을 쉽니다. 그는 본인이 연장자라는 이유로 유독 느슨한 보고 체계를 허용해달라고 은근히 압박하며 팀장인 당신을 곤란하게 합니다.',
    memberName: '최종필',
    generation: Generation.BOOMER,
    intensity: 'high',
    traits: { context: 80, driver: 20 }
  },
  {
    id: 'boundaries',
    title: '이기적인 워라밸 사수',
    category: '조직 문화',
    description: '서비스 장애로 팀 전체가 비상인 상황에서 오후 6시 정각이 되자 "저는 오늘 개인적인 약속이 있어서요"라며 로그아웃하려 합니다. 동료들이 밤샘을 각오하는 상황에서도 자기 권리만 주장하는 그에게 협업의 가치를 일깨워주세요.',
    memberName: '박지민',
    generation: Generation.MILLENNIAL,
    intensity: 'high',
    traits: { context: 40, driver: 30 }
  },
  {
    id: 'feedback-defense',
    title: '방어 기제가 심한 팀원',
    category: '피드백',
    description: '업무 오류에 대해 피드백을 주려 하자, "가이드가 부족해서 그랬다"거나 "다른 업무가 너무 많았다"며 즉각적으로 남 탓을 시작합니다. 억울하다는 표정으로 자신을 공격한다고 느끼는 팀원의 마음을 돌리고 개선을 약속받으세요.',
    memberName: '최준호',
    generation: Generation.GEN_Z,
    intensity: 'medium',
    traits: { context: 90, driver: 70 }
  },
  {
    id: 'low-motivation',
    title: '눈동자가 꺼진 에이스',
    category: '동기 부여',
    description: '누구보다 열정적이었던 팀원이 최근 최소한의 일만 하고 말수가 급격히 줄었습니다. 질문을 해도 "알아서 하겠다"는 차가운 대답뿐입니다. 심각한 번아웃이 의심되는 상황에서 그의 닫힌 마음을 다시 열 수 있을까요?',
    memberName: '강소윤',
    generation: Generation.MILLENNIAL,
    intensity: 'medium',
    traits: { context: 10, driver: 80 }
  },
  {
    id: 'change-resistance',
    title: "옛날 방식이 편한 꼰대력",
    category: '변화 관리',
    description: '효율성을 위해 새 협업 툴을 도입하려 하자, "이런 거 없어도 여태 일 잘해왔다"며 도입을 노골적으로 방해합니다. 변화를 거부하며 팀원들 사이에서 부정적인 여론을 형성하는 그를 변화의 주역으로 만드세요.',
    memberName: '정대현',
    generation: Generation.BOOMER,
    intensity: 'medium',
    traits: { context: 70, driver: 50 }
  },
  {
    id: 'promotion-fail',
    title: '승진 누락 후의 냉소',
    category: '경력 개발',
    description: '동기들은 다 승진했는데 혼자 누락되었습니다. "회사에 더 이상 충성할 이유를 모르겠다"며 공개적으로 냉소적인 태도를 보입니다. 실망한 그를 위로하면서도 냉정하게 부족했던 점을 짚어줘야 하는 어려운 면담입니다.',
    memberName: '윤지후',
    generation: Generation.MILLENNIAL,
    intensity: 'high',
    traits: { context: 30, driver: 90 }
  },
  {
    id: 'quiet-quitting',
    title: '조용한 퇴사자의 무관심',
    category: '조직 문화',
    description: '딱 월급 받은 만큼만 일하고, 팀의 비전이나 성장에 대해 말하면 "팀장님은 팀장님이고 저는 저죠"라는 태도로 일관합니다. 개인주의를 넘어 팀 활력을 떨어뜨리는 그에게 일의 의미를 다시 발견하게 하세요.',
    memberName: '임서연',
    generation: Generation.GEN_Z,
    intensity: 'low',
    traits: { context: 20, driver: 20 }
  },
  {
    id: 'micro-management',
    title: '자율성을 요구하는 반항',
    category: '피드백',
    description: '업무 확인을 할 때마다 "저를 못 믿으시는 거예요?"라며 날을 세웁니다. 사실 그의 업무 결과물은 디테일이 부족해 확인이 필수적이지만, 본인은 이를 마이크로 매니징이라며 불쾌해합니다. 신뢰와 관리 사이의 선을 명확히 그으세요.',
    memberName: '오지수',
    generation: Generation.MILLENNIAL,
    intensity: 'medium',
    traits: { context: 60, driver: 40 }
  },
  {
    id: 'skill-gap',
    title: '의욕만 앞서는 트러블 메이커',
    category: '성과 관리',
    description: '사고는 매일 치는데 열정은 넘쳐서 더 난감합니다. 사고를 수습하는 동료들은 지쳐가는데, 본인은 성과를 내고 있다고 착각 중입니다. 기를 죽이지 않으면서 실질적인 역량 보완을 지시하고 책임감을 부여하세요.',
    memberName: '한결',
    generation: Generation.GEN_Z,
    intensity: 'medium',
    traits: { context: 10, driver: 90 }
  },
  {
    id: 'remote-isolation',
    title: '재택 근무 뒤에 숨은 팀원',
    category: '동기 부여',
    description: '재택 근무를 하면서 메신저 응답은 늦고 결과물의 퀄리티는 점점 낮아집니다. 화상 미팅 때도 카메라를 끄고 최소한의 대답만 하며 소통을 회피합니다. 화면 너머 그와 정서적 유대감을 회복하고 업무 기강을 다시 잡으세요.',
    memberName: '서유나',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 50, driver: 60 }
  },
  {
    id: 'inter-gen-clash',
    title: 'MZ와 꼰대 사이의 샌드위치',
    category: '갈등 해결',
    description: '신입사원은 상사의 말투가 권위적이라며 울고, 부장님은 요즘 애들은 예의가 없다며 노발대발합니다. 중간에서 양쪽의 비난을 다 감내해야 하는 당신. 양측의 소통 방식을 중재하고 팀 화합을 이끌어내세요.',
    memberName: '권혁주',
    generation: Generation.GEN_X,
    intensity: 'high',
    traits: { context: 80, driver: 80 }
  },
  {
    id: 'over-commitment',
    title: '거절 못 하는 무능한 착함',
    category: '성과 관리',
    description: '다른 팀의 무리한 요청을 거절 못 해 다 받아와서 우리 팀 리소스를 낭비합니다. 착한 성격이지만 정작 우리 팀 목표 달성에는 큰 방해가 됩니다. 그에게 단호하게 거절하는 법과 우선순위 설정의 중요성을 가르치세요.',
    memberName: '송미래',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 95, driver: 95 }
  },
  {
    id: 'negativity-virus',
    title: '팀 사기를 꺾는 투덜이',
    category: '조직 문화',
    description: '회사 복지, 점심 메뉴, 동료의 성과까지도 비꼬며 부정적인 에너지를 퍼뜨립니다. "회사 망하는 거 아냐?"라는 식의 농담으로 팀 분위기를 흐리는 그를 불러 엄중히 경고하고 긍정적인 태도 변화를 촉구하세요.',
    memberName: '고진우',
    generation: Generation.GEN_X,
    intensity: 'high',
    traits: { context: 20, driver: 10 }
  },
  {
    id: 'career-pivot',
    title: '인재의 직무 권태와 이탈',
    category: '경력 개발',
    description: '현재 직무에서 최고의 성과를 내고 있지만, 본인은 이 일이 적성에 맞지 않는다며 다른 직무로 옮기고 싶어 합니다. 에이스를 잃는 건 팀에 큰 타격입니다. 그를 설득해 현재 직무에서 새로운 성장의 기회를 보게 하세요.',
    memberName: '배현우',
    generation: Generation.GEN_Z,
    intensity: 'low',
    traits: { context: 30, driver: 60 }
  },
  {
    id: 'transparency-demand',
    title: '인사 고과에 대한 도발적 항의',
    category: '피드백',
    description: '연봉 인상률이 낮다며 산정 기준을 엑셀 파일로 보여달라고 요구합니다. "팀장님이 저를 개인적으로 싫어해서 낮게 주신 거 아니냐"며 공격적인 태도로 면담에 임하는 팀원을 논리적으로 설득하세요.',
    memberName: '신예은',
    generation: Generation.GEN_Z,
    intensity: 'high',
    traits: { context: 10, driver: 20 }
  },
  {
    id: 'quality-vs-speed',
    title: '속박당한 완벽주의자',
    category: '성과 관리',
    description: '디테일에 집착하느라 마감을 3일이나 넘겼습니다. 결과물은 훌륭하지만 전체 프로젝트 일정에 차질을 주고 있습니다. "대충해서 낼 수는 없다"는 고집 센 팀원에게 비즈니스 관점의 속도와 타협점을 지시하세요.',
    memberName: '박건우',
    generation: Generation.MILLENNIAL,
    intensity: 'medium',
    traits: { context: 40, driver: 20 }
  },
  {
    id: 'hidden-agenda',
    title: '정치질로 갈라진 팀원들',
    category: '갈등 해결',
    description: '겉으로는 업무적 충돌 같지만 실제로는 개인적인 감정과 파벌이 섞인 갈등입니다. 교묘하게 여론을 조작해 특정 팀원을 소외시키려는 이면의 의도를 간파하고, 무너진 팀워크를 회복시키세요.',
    memberName: '이선화',
    generation: Generation.GEN_X,
    intensity: 'high',
    traits: { context: 95, driver: 80 }
  },
  {
    id: 'recognition-starve',
    title: '관심 중독형 팀원',
    category: '동기 부여',
    description: '잘하고 있다는 칭찬을 수시로 해주지 않으면 불안해하고 의욕이 꺾입니다. 동료들은 그가 팀장의 편애를 받는다고 오해할까 걱정입니다. 그가 스스로 성취감을 느끼고 자립할 수 있도록 코칭하세요.',
    memberName: '김하온',
    generation: Generation.GEN_Z,
    intensity: 'low',
    traits: { context: 50, driver: 95 }
  },
  {
    id: 'tech-debt',
    title: '이상주의자 개발자와의 충돌',
    category: '변화 관리',
    description: '신규 기능 런칭이 코앞인데, 코드가 지저분하다며 전체 리팩토링을 하지 않으면 개발을 중단하겠다고 버팁니다. 기술적 부채 해결과 비즈니스 마감 사이의 팽팽한 간극을 중재하세요.',
    memberName: '조유진',
    generation: Generation.MILLENNIAL,
    intensity: 'medium',
    traits: { context: 30, driver: 20 }
  },
  {
    id: 'passive-aggressive-meeting',
    title: '회의실 침묵, 메신저 독설가',
    category: '갈등 해결',
    description: '회의 때는 가만히 있다가 회의가 끝나면 메신저로 "그렇게 하면 망할 게 뻔한데 왜 하는지 모르겠네요"라며 뒤에서 여론을 흐립니다. 면전에서는 대화를 피하는 그를 끌어내어 건강한 소통을 유도하세요.',
    memberName: '한민석',
    generation: Generation.MILLENNIAL,
    intensity: 'high',
    traits: { context: 90, driver: 30 }
  },
  {
    id: 'fragile-ego-feedback',
    title: "사이다를 빙자한 가스라이팅 호소",
    category: '피드백',
    description: '단순한 업무 팩트 수정을 요청했을 뿐인데 "팀장님 지금 저 가스라이팅 하시는 거예요?"라며 눈물을 보입니다. 팀원들 앞에서 당신을 순식간에 악질 상사로 몰아가는 그의 유리 멘탈을 어떻게 다뤄야 할까요?',
    memberName: '이루다',
    generation: Generation.GEN_Z,
    intensity: 'high',
    traits: { context: 40, driver: 95 }
  },
  {
    id: 'selective-work-allergy',
    title: '생색나는 일만 하는 체리피커',
    category: '성과 관리',
    description: '어렵고 궂은 일은 동료에게 은근슬쩍 떠넘기고, 대표님이나 임원들이 보는 화려한 성과물에만 기를 쓰고 참여하려 합니다. 팀 내 협업 분위기를 해치는 그의 이기적인 성과 중심 사고를 교정하세요.',
    memberName: '백승현',
    generation: Generation.MILLENNIAL,
    intensity: 'medium',
    traits: { context: 30, driver: 10 }
  },
  {
    id: 'growth-refusal',
    title: '성장을 거부하는 안주형 시니어',
    category: '경력 개발',
    description: '실력은 뛰어나지만 "저는 승진도 관심 없고 이대로가 좋습니다. 더 이상 일 배우기 싫어요"라며 모든 새로운 시도를 거부합니다. 팀의 활력을 떨어뜨리는 고인 물이 되지 않도록 새로운 동기를 부여하세요.',
    memberName: '김문숙',
    generation: Generation.GEN_X,
    intensity: 'low',
    traits: { context: 70, driver: 60 }
  },
  {
    id: 'side-project-overload',
    title: '부업에 진심, 본업은 부업인 팀원',
    category: '조직 문화',
    description: '근무 시간 중에도 개인 유튜브 채널이나 스마트스토어 관리로 바쁩니다. 업무 시간에 자리를 비우는 일도 잦고, 업무 지시를 하면 "바쁘다"는 핑계부터 댑니다. 회사를 월급 주는 수단으로만 여기는 그를 일에 몰입하게 하세요.',
    memberName: '최재현',
    generation: Generation.GEN_Z,
    intensity: 'medium',
    traits: { context: 10, driver: 15 }
  },
  {
    id: 'stealing-credit-misconception',
    title: '성과 가로채기 오해와 불신',
    category: '피드백',
    description: '팀 전체의 보고서에서 본인의 기여도가 부족하다며, 팀장이 자기 공을 가로챘다고 믿고 있습니다. 회의실에서 대놓고 공격적인 태도를 보이는 그에게 팀워크의 정의와 리더의 역할을 논리적으로 설명하세요.',
    memberName: '송아름',
    generation: Generation.MILLENNIAL,
    intensity: 'high',
    traits: { context: 20, driver: 80 }
  },
  {
    id: 'informal-leader',
    title: '나이 어린 팀장을 흔드는 완장러',
    category: '갈등 해결',
    description: '당신보다 경력이 긴 팀원입니다. 사적인 자리에서 "팀장님이 잘 몰라서 그러는데..."라며 다른 팀원들에게 당신의 지시를 무시하도록 선동합니다. 비공식적 리더십으로 팀을 장악하려는 그와 담판을 지으세요.',
    memberName: '정만식',
    generation: Generation.GEN_X,
    intensity: 'high',
    traits: { context: 85, driver: 25 }
  },
  {
    id: 'selective-honesty',
    title: '사과 없는 "저는 솔직한 것뿐입니다"',
    category: '조직 문화',
    description: '팀원들에게 무례한 발언을 쏟아낸 후, 지적을 받으면 "저는 뒤끝 없고 솔직한 사람이라 그렇습니다. 그게 나쁜가요?"라고 당당하게 말합니다. 무례함과 솔직함을 구분 못 하는 그에게 직장 내 에티켓을 가르치세요.',
    memberName: '남궁민',
    generation: Generation.GEN_Z,
    intensity: 'medium',
    traits: { context: 15, driver: 40 }
  },
  {
    id: 'tmi-energy-drainer',
    title: '팀 전체를 감정 쓰레기통 삼는 팀원',
    category: '조직 문화',
    description: '아침부터 밤까지 개인적인 연애 고민, 가정사, 신세 한탄을 팀원들에게 털어놓습니다. 팀원들은 피곤해하고 업무 집중도는 곤두박질칩니다. 정서적 유대감을 넘어서는 과도한 TMI를 차단하고 업무로 복귀시키세요.',
    memberName: '이지혜',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 95, driver: 95 }
  },
  {
    id: 'emotional-rollercoaster',
    title: '기분이 업무 태도가 되는 에이스',
    category: '동기 부여',
    description: '능력은 완벽하지만 기분이 좋을 때와 나쁠 때의 업무 퀄리티 차이가 극과 극입니다. 기분이 나쁘면 팀 전체에 냉기를 뿜으며 소통을 거부합니다. 감정 조절이 안 되는 에이스를 어떻게 성숙한 프로로 만들 수 있을까요?',
    memberName: '강승우',
    generation: Generation.GEN_Z,
    intensity: 'medium',
    traits: { context: 40, driver: 85 }
  },
  // ─── 일상적(low) 강도 시나리오 ───────────────────────────────
  {
    id: 'new-hire-lost',
    title: '방치된 신입의 조용한 표류',
    category: '성과 관리',
    description: '입사 3주째 신입인데 담당 업무가 아직 명확하지 않아 하루 종일 무엇을 해야 할지 모르고 있습니다. 질문을 하려 해도 팀이 너무 바빠 보여 말을 꺼내지 못하고, 결국 혼자 인터넷 검색으로 시간을 보내고 있습니다. 조용히 표류 중인 신입의 온보딩을 챙겨주세요.',
    memberName: '이수아',
    generation: Generation.GEN_Z,
    intensity: 'low',
    traits: { context: 60, driver: 70 }
  },
  {
    id: 'presentation-anxiety',
    title: '발표 공포로 기회를 놓치는 인재',
    category: '경력 개발',
    description: '업무 능력은 팀 내 최상위권이지만 발표 자리만 되면 목소리가 떨리고 머릿속이 하얘진다고 합니다. 팀장 대신 임원 앞에서 발표할 기회가 생겼는데, 긴장한다며 다른 팀원에게 양보하려 합니다. 성장 기회를 스스로 외면하는 그를 자신 있게 무대에 세워주세요.',
    memberName: '황도윤',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 70, driver: 75 }
  },
  {
    id: 'always-last-minute',
    title: '항상 마감 직전에 제출하는 습관',
    category: '성과 관리',
    description: '결과물의 품질은 나쁘지 않지만, 항상 마감 1시간 전에야 보고서를 제출합니다. 팀장이 검토하고 피드백을 줄 시간이 없어 매번 날것으로 윗선에 올라가는 상황입니다. 업무 습관 개선을 자연스럽게 이끌어내세요.',
    memberName: '문서준',
    generation: Generation.GEN_Z,
    intensity: 'low',
    traits: { context: 30, driver: 50 }
  },
  {
    id: 'meeting-rambler',
    title: '회의 시간을 독차지하는 장황함',
    category: '조직 문화',
    description: '회의 때마다 결론 없이 배경 설명과 개인 경험담으로 20분을 쓰는 팀원이 있습니다. 다른 팀원들은 눈치를 주지만 본인은 인식하지 못합니다. 다음 팀 회의가 내일인데, 이 패턴을 부드럽게 짚어주고 핵심 전달 방식을 코칭해주세요.',
    memberName: '조성민',
    generation: Generation.GEN_X,
    intensity: 'low',
    traits: { context: 90, driver: 60 }
  },
  {
    id: 'eighty-percent-finisher',
    title: '마무리가 없는 80% 완성주의자',
    category: '성과 관리',
    description: '기획력과 실행력은 뛰어난데, 항상 프로젝트의 마지막 20%를 흐지부지 끝냅니다. "이 정도면 됐겠죠"라는 생각으로 마감을 처리하고, 사후 정리나 공유도 잘 하지 않습니다. 완성도의 기준을 높이고 마무리 습관을 잡아주세요.',
    memberName: '장예린',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 20, driver: 40 }
  },
  {
    id: 'silent-struggle',
    title: '힘들어도 말 못 하는 팀원',
    category: '조직 문화',
    description: '최근 들어 표정이 어둡고 업무 속도가 눈에 띄게 느려졌습니다. 별일 없냐고 물으면 "괜찮아요"라고만 합니다. 사실 개인적으로 힘든 상황이 있는 것 같지만 팀에 민폐가 될까 봐 말을 못 하고 있는 것 같습니다. 먼저 마음의 문을 두드려주세요.',
    memberName: '오하영',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 80, driver: 85 }
  },
  {
    id: 'upward-feedback-averse',
    title: '팀장에게 솔직한 말을 못 하는 팀원',
    category: '피드백',
    description: '팀원들끼리는 팀장의 결정에 불만이 있다는 걸 알고 있지만, 정작 팀장 앞에서는 아무도 말하지 않습니다. 특히 이 팀원은 "말해봤자 뭐가 달라지겠냐"는 체념이 깊습니다. 심리적 안전감을 느낄 수 있도록 솔직한 대화의 물꼬를 터주세요.',
    memberName: '전지훈',
    generation: Generation.GEN_Z,
    intensity: 'low',
    traits: { context: 75, driver: 55 }
  },
  {
    id: 'unclear-instructions-confusion',
    title: '지시가 엇갈려 나온 엉뚱한 결과물',
    category: '피드백',
    description: '중요한 보고서를 지시했는데, 팀원이 전혀 다른 방향으로 작성해왔습니다. 팀원은 자신은 지시대로 했다고 생각하고 있고, 사실 처음 지시가 다소 모호했던 것도 있습니다. 탓하지 않고 명확한 커뮤니케이션 방식을 서로 맞춰가는 면담을 해보세요.',
    memberName: '하준서',
    generation: Generation.GEN_Z,
    intensity: 'low',
    traits: { context: 45, driver: 65 }
  },
  {
    id: 'learning-vs-delivering',
    title: '성장욕구와 바쁜 현실 사이의 팀원',
    category: '경력 개발',
    description: '"저도 새로운 기술을 배우고 싶은데 매일 쏟아지는 업무 때문에 시간이 없어요"라고 조심스럽게 털어놨습니다. 번아웃은 아니고 오히려 더 잘하고 싶은 의욕인데, 현실 여건 때문에 좌절하는 상태입니다. 성장 욕구를 업무와 연결지어 현실적인 개발 계획을 같이 세워주세요.',
    memberName: '유소정',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 40, driver: 70 }
  },
  {
    id: 'perfectionist-report-delay',
    title: '완벽함을 추구하다 늦어지는 보고',
    category: '피드백',
    description: '보고서 하나를 쓰는 데 다른 팀원의 3배 시간이 걸립니다. 이유는 "완벽하게 해서 드리고 싶어서요." 내용의 완성도는 인정하지만 타이밍을 놓치는 일이 잦아졌습니다. 완성도와 속도 사이의 균형을 스스로 찾도록 함께 기준을 세워주세요.',
    memberName: '박세영',
    generation: Generation.MILLENNIAL,
    intensity: 'low',
    traits: { context: 35, driver: 30 }
  }
];
