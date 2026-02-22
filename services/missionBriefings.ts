
export interface MissionBriefing {
  statusSummary: {
    psychState: string;        // 현재 심리 상태
    strengths: string[];       // 핵심 강점
    weaknesses: string[];      // 핵심 약점
    performance: string[];     // 최근 3개년 고과 (상/중/하 또는 구체적 피드백)
  };
  competencyData: {
    performance: number;       // 성과
    stress: number;            // 스트레스
    potential: number;         // 성장 잠재력
    loyalty: number;           // 충성도
    communication: number;     // 소통
  };
  history?: {
    type: string;
    text: string;
    date: string;
  }[];
  idealState: string;
  theory: string;
  tasks: string[];
}

export const MISSION_BRIEFINGS: Record<string, MissionBriefing> = {
  'late-comer': {
    statusSummary: {
      psychState: "불안과 미안함이 섞여 있으나, 반복되는 지각으로 인해 무뎌진 상태",
      strengths: ["빠른 업무 습득", "팀원들과의 원만한 관계"],
      weaknesses: ["시간 관리 미흡", "마감 직전 집중력 저조"],
      performance: ["2023: 준수(B+)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 85, stress: 45, potential: 90, loyalty: 60, communication: 75 },
    history: [
      { type: "COACHING SESSION", text: "지각 횟수가 늘고 있어요. 시간 관리에 신경 써주세요.", date: "2026.01.12" },
      { type: "CASUAL TALK", text: "업무 효율은 좋은데 출근 시간이 불규칙하네요.", date: "2025.12.20" }
    ],
    idealState: "지각이 '팀의 신뢰 비용'을 발생시킴을 인지하고, 구체적인 개선 행동(Behavior)을 약속한 상태",
    theory: "상호 신뢰와 책임 모델",
    tasks: [
      "비난 대신 관찰된 사실(시간)과 그로 인한 팀의 영향(Impact)을 연결하여 전달하세요.",
      "팀원이 자신의 지각이 동료들의 심리적 안전감을 해친다는 것을 스스로 말하게 유도하세요.",
      "지키지 못할 약속 대신, 내일부터 당장 실천 가능한 '작은 루틴'을 합의하세요."
    ]
  },
  'team-clash': {
    statusSummary: {
      psychState: "자신의 전문성이 침해받는다고 느껴 공격적이고 방어적인 상태",
      strengths: ["독보적인 기술 전문성", "철저한 업무 책임감"],
      weaknesses: ["협업 소통 부족", "새로운 방식에 대한 거부감"],
      performance: ["2023: 최우수(S)", "2024: 최우수(S)", "2025: 우수(A)"]
    },
    competencyData: { performance: 95, stress: 80, potential: 70, loyalty: 85, communication: 40 },
    history: [
      { type: "CONFLICT MANAGEMENT", text: "제 방식이 맞아요. 다른 팀원들이 이해를 못 하는 겁니다.", date: "2026.02.05" },
      { type: "TECHNICAL REVIEW", text: "레거시 코드를 건드리는 건 리스크가 너무 큽니다.", date: "2026.01.15" }
    ],
    idealState: "시니어의 경험을 존중하되, 의사결정 체계(Hierarchy)는 명확히 재정립된 '상호 존중' 상태",
    theory: "Hierarchy & Respect 모델",
    tasks: [
      "시니어의 과거 경험을 '존중받아야 할 자산'으로 명명하여 심리적 저항을 낮추세요.",
      "의사결정의 권한은 리더에게 있음을 명확히 하되, 자문(Advisory) 역할을 공식적으로 부여하세요.",
      "팀 전체 분위기를 해치지 않는 선에서 불만을 표출할 수 있는 1:1 채널을 여세요."
    ]
  },
  'boundaries': {
    statusSummary: {
      psychState: "개인의 삶을 보호하려는 의지가 강하며 업무 과부하에 민감한 상태",
      strengths: ["정확한 마감 준수", "효율적인 시간 배분"],
      weaknesses: ["팀 긴급 상황 협조 부족", "업무외 책임 공유 기피"],
      performance: ["2023: 준수(B)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 75, stress: 30, potential: 65, loyalty: 50, communication: 80 },
    idealState: "개인의 워라밸을 지키면서도, 팀의 비상 상황에서는 유연하게 기여(Commitment)하기로 합의된 상태",
    theory: "Commitment & Boundary 모델",
    tasks: [
      "칼퇴근 자체를 비난하지 말고, 현재 상황의 특수성(Emergency)을 비즈니스 관점에서 설명하세요.",
      "팀원이 우려하는 '개인 시간 침해'가 일회성임을 약속하고 안전감을 주세요.",
      "동료들의 희생에 무임승차(Free-riding)하는 것이 아님을 인지시키세요."
    ]
  },
  'feedback-defense': {
    statusSummary: {
      psychState: "자신의 실수를 인정하는 것을 극도로 두려워하며 자기방어 기제가 최고조에 달한 상태",
      strengths: ["빠른 문제 인지", "강한 자존감"],
      weaknesses: ["자기 비판 능력 부족", "피드백 수용성 저하"],
      performance: ["2023: 준수(B+)", "2024: 준수(B)", "2025: 보통(B)"]
    },
    competencyData: { performance: 80, stress: 70, potential: 75, loyalty: 65, communication: 30 },
    idealState: "팀원의 방어 기제가 '두려움'에서 기인했음을 인지하고, 심리적 안전감을 확보한 '정직한 소통' 상태",
    theory: "심리적 안전감(Psychological Safety)",
    tasks: [
      "팀원의 방어 기제가 '두려움'에서 기인했음을 인지하고, 심리적 안전감을 먼저 확보하세요.",
      "'너의 잘못'이 아닌 '우리가 해결해야 할 프로세스 문제'로 프레임을 전환하세요.",
      "변명이 나올 때마다 끊지 말고 끝까지 듣되, 팩트(Fact)로 차분히 다시 돌아오세요."
    ]
  },
  'low-motivation': {
    statusSummary: {
      psychState: "번아웃 전조 증상을 보이며, 업무의 의미와 주도성을 상실해 냉소적으로 변한 상태",
      strengths: ["꼼꼼한 업무 처리", "안정적인 시스템 관리"],
      weaknesses: ["에너지 고갈", "새로운 제안에 소극적"],
      performance: ["2023: 우수(A)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 75, stress: 90, potential: 80, loyalty: 40, communication: 60 },
    idealState: "통제받는 느낌에서 벗어나, 업무의 주도권(Autonomy)을 회복하고 작은 성취를 목표로 설정한 상태",
    theory: "자발성 및 주도성 이론",
    tasks: [
      "현재 느끼는 무력감의 원인이 '통제감 상실'인지 '의미 상실'인지 파악하세요.",
      "과거에 그가 가장 빛났던 순간을 상기시키며 유능감(Competence)을 자극하세요.",
      "리더가 개입하지 않을 '완전한 권한 위임 영역'을 작게라도 하나 만들어주세요."
    ]
  },
  'change-resistance': {
    statusSummary: {
      psychState: "과거의 성공 방식에 집착하며, 변화를 위협으로 간주해 불안해하는 상태",
      strengths: ["기존 프로세스 숙달", "팀원들과의 돈독한 유대"],
      weaknesses: ["유연성 부족", "학습 의지 저하"],
      performance: ["2023: 우수(A)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 80, stress: 65, potential: 50, loyalty: 90, communication: 70 },
    idealState: "변화의 필요성(Awareness)을 인정하고, 새로운 방식에 참여하려는 욕구(Desire)를 표현하는 상태",
    theory: "ADKAR 변화 관리 모델",
    tasks: [
      "과거 방식의 기여를 충분히 인정하여 '부정당했다'는 느낌을 지워주세요.",
      "새로운 툴 도입이 그에게 가져다줄 실질적인 이익(Benefit)을 구체적으로 제시하세요.",
      "변화의 장애물을 리더가 함께 제거해주겠다는 지원(Support) 의사를 밝히세요."
    ]
  },
  'promotion-fail': {
    statusSummary: {
      psychState: "인사 고과 탈락으로 인해 분노와 좌절감이 섞여 있으며, 회사의 평가 시스템을 불신하는 상태",
      strengths: ["높은 업무 열정", "과거의 우수한 성과"],
      weaknesses: ["감정 조절 부족", "결과에 대한 과도한 집착"],
      performance: ["2023: 우수(A)", "2024: 우수(A)", "2025: 미흡(C)"]
    },
    competencyData: { performance: 60, stress: 95, potential: 85, loyalty: 30, communication: 50 },
    idealState: "감정적 분노 단계를 지나, 다음 기회를 위해 부족했던 역량(Gap)을 객관적으로 직시하는 상태",
    theory: "회복 탄력성 및 성장 마인드셋",
    tasks: [
      "충분한 감정 배설의 시간을 허용하고, 위로보다는 '경청'에 집중하세요.",
      "탈락의 원인을 모호하게 포장하지 말고, 데이터 기반으로 명확히 피드백하세요.",
      "다음 승진을 위한 구체적인 액션 플랜(IDP)을 함께 수립하자고 제안하세요."
    ]
  },
  'quiet-quitting': {
    statusSummary: {
      psychState: "회사에 대한 기대를 접고 최소한의 업무만 수행하며, 심리적으로 이미 이직한 상태",
      strengths: ["안정적인 루틴 업무", "명확한 선 긋기"],
      weaknesses: ["주도성 전멸", "팀 기여 의지 부족"],
      performance: ["2023: 준수(B+)", "2024: 보통(B)", "2025: 보통(B)"]
    },
    competencyData: { performance: 70, stress: 20, potential: 40, loyalty: 20, communication: 60 },
    idealState: "주어진 업무 안에서 본인이 흥미를 느끼는 요소를 재발견하고, 최소한의 몰입(Engagement)을 회복한 상태",
    theory: "몰입(Engagement) 모델",
    tasks: [
      "업무와 개인의 삶을 완전히 분리하려는 태도를 존중하되, '프로의 책임' 선을 명확히 하세요.",
      "현재 업무 중 그나마 그가 흥미를 느끼는 부분을 찾아 확장시켜주세요.",
      "팀의 목표 달성이 그의 커리어에도 도움이 되는 접점(Linkage)을 찾아주세요."
    ]
  },
  'micro-management': {
    statusSummary: {
      psychState: "리더의 잦은 개입으로 인해 자율성을 상실하고, 감시받는다는 불쾌감과 무력감을 느끼는 상태",
      strengths: ["세밀한 실행력", "정확한 보고"],
      weaknesses: ["의사결정 주저", "리더 의존성 심화"],
      performance: ["2023: 준수(B+)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 80, stress: 85, potential: 75, loyalty: 70, communication: 50 },
    idealState: "중간 보고가 '감시'가 아닌 '신뢰 비용을 낮추는 투자'임을 이해하고, 자발적 공유를 약속한 상태",
    theory: "신뢰 투자 가이드",
    tasks: [
      "잦은 확인은 '못 믿어서'가 아니라 '리스크 관리' 차원임을 비즈니스 언어로 설명하세요.",
      "결과물의 퀄리티가 확보되면 확인 빈도를 줄이겠다는 조건부 위임을 제안하세요.",
      "팀원이 생각하는 '적절한 자율성'의 범위를 물어보고 협상하세요."
    ]
  },
  'skill-gap': {
    statusSummary: {
      psychState: "의욕은 넘치나 실제 역량이 업무 난이도를 따라가지 못해 실수가 잦고 초조해하는 상태",
      strengths: ["높은 학습 의지", "긍정적인 마인드"],
      weaknesses: ["업무 완성도 미흡", "리스크 감지 능력 부족"],
      performance: ["2023: 신입/해당없음", "2024: 보통(B)", "2025: 미흡(C)"]
    },
    competencyData: { performance: 40, stress: 70, potential: 95, loyalty: 85, communication: 90 },
    idealState: "자신의 역량 부족(Gap)을 메타인지하고, 의욕을 앞세우기보다 구체적인 학습 계획을 수립한 상태",
    theory: "Situational Leadership II",
    tasks: [
      "열정은 높이 사되, 결과물의 결함이 팀에 미치는 리스크를 냉정하게 짚어주세요.",
      "'알아서 해보라'는 위임 대신, 구체적인 지시(Directing) 단계로 리더십을 전환하세요.",
      "실수를 예방할 수 있는 체크리스트나 중간 점검 프로세스를 강제하세요."
    ]
  },
  'remote-isolation': {
    statusSummary: {
      psychState: "물리적 거리로 인해 팀과의 연결감이 약해지고 소외감을 느끼고 있는 상태",
      strengths: ["독립적 업무 수행", "비대면 툴 숙달"],
      weaknesses: ["정보 고립", "정서적 유대감 저하"],
      performance: ["2023: 준수(B+)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 80, stress: 65, potential: 70, loyalty: 50, communication: 40 },
    idealState: "물리적 거리가 심리적 거리로 이어지지 않음을 확인하고, 랜선 너머의 '실재감(Presence)'을 회복한 상태",
    theory: "Social Presence 이론",
    tasks: [
      "업무 이야기 전, 정서적인 스몰토크(Rapport)로 연결감을 먼저 확보하세요.",
      "비언어적 소통(카메라 켜기, 반응하기)이 협업에 필수적인 예의임을 설득하세요.",
      "재택 중 겪는 어려움이 없는지 묻고, 환경적 지원을 제안하세요."
    ]
  },
  'inter-gen-clash': {
    statusSummary: {
      psychState: "서로 다른 가치관과 소통 방식의 차이로 인해 상대방을 '이해 불가' 대상으로 규정한 상태",
      strengths: ["확고한 소신", "직무 전문성"],
      weaknesses: ["수용성 부족", "편견 섞인 대화"],
      performance: ["2023: 우수(A)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 85, stress: 75, potential: 60, loyalty: 70, communication: 20 },
    idealState: "세대 차이를 '틀림'이 아닌 '다름'으로 인식하고, 양측의 입장을 중재할 수 있는 완충 지대를 형성한 상태",
    theory: "DEI(다양성, 형평성, 포용성)",
    tasks: [
      "양쪽의 입장을 모두 공감해주되, 전언(傳言)하지 말고 직접 소통하게 유도하세요.",
      "서로 다른 업무 스타일이 팀의 다양성(Diversity)에 기여할 수 있음을 재정의하세요.",
      "감정 섞인 비난을 팩트 중심의 요청(Request)으로 번역하여 전달하세요."
    ]
  },
  'over-commitment': {
    statusSummary: {
      psychState: "거절하지 못하는 성격으로 인해 과도한 업무를 떠안아 에너지가 고갈되기 직전인 상태",
      strengths: ["타인 조력", "높은 책임감"],
      weaknesses: ["우선순위 혼선", "자기 희생적 태도"],
      performance: ["2023: 준수(B+)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 75, stress: 95, potential: 80, loyalty: 90, communication: 80 },
    idealState: "'거절'이 나쁜 것이 아님을 인지하고, 우리 팀의 목표(Priority)를 위해 외부 요청을 차단하기로 한 상태",
    theory: "Priority Focus 모델",
    tasks: [
      "착한 사람(Nice Guy)이 되려는 욕구가 팀의 성과를 갉아먹고 있음을 직면시키세요.",
      "모든 것을 다 하려는 것은 아무것도 제대로 못 하는 것과 같음을 상기시키세요.",
      "정중하지만 단호하게 거절하는 구체적인 스크립트를 코칭하세요."
    ]
  },
  'negativity-virus': {
    statusSummary: {
      psychState: "조직 전반에 대한 깊은 불신을 가지고 있으며, 주변 동료들에게 부정적인 에너지를 전파하는 상태",
      strengths: ["비판적 사고", "리스크 감지"],
      weaknesses: ["냉소주의", "팀 화합 저해"],
      performance: ["2023: 보통(B)", "2024: 미흡(C)", "2025: 보통(B)"]
    },
    competencyData: { performance: 65, stress: 80, potential: 50, loyalty: 10, communication: 30 },
    idealState: "자신의 부정적 언어가 팀 분위기를 오염시키고 있음을 자각하고, 불만 표출 방식을 공식 채널로 한정한 상태",
    theory: "Morale & Culture 관리",
    tasks: [
      "농담으로 포장된 냉소를 묵인하지 말고, 듣는 즉시 정색하며 제지(Confront)하세요.",
      "불만의 내용(Content)과 태도(Attitude)를 분리하여, 태도 문제를 엄중히 경고하세요.",
      "팀원들에게 미치는 악영향을 구체적인 사례로 들어 설명하세요."
    ]
  },
  'career-pivot': {
    statusSummary: {
      psychState: "현재 직무에서 더 이상의 성장을 느끼지 못하고, 새로운 커리어로의 전환을 심각하게 고민하는 상태",
      strengths: ["지적 호기심", "커리어 설계 능력"],
      weaknesses: ["현재 업무 몰입도 저하", "방황하는 태도"],
      performance: ["2023: 우수(A)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 70, stress: 60, potential: 95, loyalty: 30, communication: 75 },
    idealState: "현재 직무에서의 성과가 미래 커리어 전환의 훌륭한 포트폴리오가 됨을 깨닫고, 유종의 미를 약속한 상태",
    theory: "IDP(개별 개발 계획)",
    tasks: [
      "떠나고 싶은 마음을 비난하지 말고, 그의 커리어 고민을 진심으로 경청하세요.",
      "현재 맡은 프로젝트의 성공이 이직/전직 시 강력한 무기가 됨을 설득하세요.",
      "팀 내에서 새로운 직무 경험을 조금이라도 할 수 있는 기회(Side Project)를 탐색하세요."
    ]
  },
  'transparency-demand': {
    statusSummary: {
      psychState: "의사결정 과정이 불투명하다고 느끼며, 모든 정보의 완전한 공개를 강력히 요구하는 상태",
      strengths: ["공정성 중시", "논리적 판단"],
      weaknesses: ["수용성 저하", "공격적인 태도"],
      performance: ["2023: 준수(B+)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 80, stress: 70, potential: 70, loyalty: 50, communication: 40 },
    idealState: "평가 결과 자체는 아쉽더라도, 평가 기준과 절차의 투명성(Procedural Justice)에는 납득한 상태",
    theory: "절차적 공정성 이론",
    tasks: [
      "감정적 대응을 자제하고, 평가 기준표(Rubric)를 펴놓고 팩트 대 팩트로 대화하세요.",
      "동료와의 비교가 아닌, 절대적인 성과 달성도에 초점을 맞추세요.",
      "공격적인 태도 이면에 깔린 '인정받고 싶은 욕구'를 읽어주세요."
    ]
  },
  'quality-vs-speed': {
    statusSummary: {
      psychState: "장인 정신이 과하여 납기를 맞추는 것보다 완벽한 품질을 만드는 것에만 집착하는 상태",
      strengths: ["디테일", "완성도 중심"],
      weaknesses: ["납기 지연", "비즈니스 마인드 부족"],
      performance: ["2023: 우수(A)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 90, stress: 60, potential: 80, loyalty: 85, communication: 50 },
    idealState: "비즈니스에서는 '완벽'보다 '적시성(Timing)'이 더 중요한 품질임을 깨닫고, MVP 마인드셋을 수용한 상태",
    theory: "MVP(최소 기능 제품) 사고 방식",
    tasks: [
      "장인 정신은 존중하되, 납기를 어기는 것은 프로답지 않음을 강조하세요.",
      "80%의 완성도로 빠르게 피드백을 받는 것이 결과적으로 퀄리티를 높임을 설득하세요.",
      "데드라인은 협상의 대상이 아님을 명확히 하세요."
    ]
  },
  'hidden-agenda': {
    statusSummary: {
      psychState: "표면적으로는 협조하는 척하나 뒤에서는 본인의 사적 이익이나 정치를 우선시하는 상태",
      strengths: ["정무 감각", "전략적 소통"],
      weaknesses: ["진정성 부족", "팀워크 저해"],
      performance: ["2023: 준수(B+)", "2024: 보통(B)", "2025: 보통(B)"]
    },
    competencyData: { performance: 75, stress: 50, potential: 60, loyalty: 30, communication: 60 },
    idealState: "표면적인 갈등 뒤에 숨겨진 진짜 욕구(Interest)를 드러내고, 정치질 대신 실력으로 경쟁하기로 한 상태",
    theory: "Interest-Based Negotiation",
    tasks: [
      "빙 돌려 말하는 화법을 차단하고, 원하는 바가 무엇인지 직설적으로 물어보세요.",
      "팀 내 파벌 형성이 결국 본인의 평판 리스크가 됨을 경고하세요.",
      "모든 논의를 '팀 목표 달성'이라는 대원칙 위로 끌어올리세요."
    ]
  },
  'recognition-starve': {
    statusSummary: {
      psychState: "주변의 끊임없는 칭찬과 인정을 갈구하며, 피드백이 늦어지면 극심한 불안을 느끼는 상태",
      strengths: ["인정 시 폭발적 성과", "성실한 태도"],
      weaknesses: ["낮은 자존감", "정서적 의존"],
      performance: ["2023: 준수(B+)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 80, stress: 70, potential: 70, loyalty: 85, communication: 90 },
    idealState: "외부의 칭찬 없이도 스스로 성취감을 느끼는 내재적 동기(Intrinsic Motivation) 단계로 진입을 시도하는 상태",
    theory: "내재적 동기 이론",
    tasks: [
      "결과에 대한 칭찬보다 과정과 노력에 대한 격려(Encouragement)로 전환하세요.",
      "매번 리더에게 확인받지 않고 스스로 판단하고 결정할 기회를 주세요.",
      "인정 욕구를 팀 기여로 승화시킬 수 있는 발표/공유 자리를 마련해주세요."
    ]
  },
  'tech-debt': {
    statusSummary: {
      psychState: "급하게 구현된 코드로 인한 기술 부채를 견디지 못하며, 당장의 비즈니스 로직 구현에 환멸을 느끼는 상태",
      strengths: ["엔지니어링 전문성", "설계 능력"],
      weaknesses: ["비즈니스 이해도 부족", "타협 없는 태도"],
      performance: ["2023: 준수(B+)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 85, stress: 80, potential: 90, loyalty: 70, communication: 30 },
    idealState: "비즈니스 속도와 기술적 완성도 사이의 트레이드오프(Trade-off)를 이해하고, 단계적 리팩토링 계획에 합의한 상태",
    theory: "기술 부채(Tech Debt) 관리",
    tasks: [
      "개발자의 장인 정신을 존중하되, 회사의 생존(매출/런칭)이 우선임을 설득하세요.",
      "'나중에 반드시 고친다'는 약속을 하고 이를 문서화하여 신뢰를 주세요.",
      "비즈니스 임팩트를 주면서 부채도 갚을 수 있는 절충안을 함께 고민하세요."
    ]
  },
  'passive-aggressive-meeting': {
    statusSummary: {
      psychState: "회의 때는 침묵하거나 동의하는 척하지만, 실제로는 행동하지 않거나 뒤에서 반박하는 수동적 공격 상태",
      strengths: ["표면적 원만함", "실행 약속"],
      weaknesses: ["진실성 결여", "신뢰 파괴"],
      performance: ["2023: 보통(B)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 70, stress: 60, potential: 60, loyalty: 40, communication: 20 },
    idealState: "뒤에서 불평하는 대신, 회의 시간 내에 자신의 반대 의견을 논리적으로 개진하는 건설적 대립자가 된 상태",
    theory: "건설적 대립(Constructive Confrontation)",
    tasks: [
      "침묵은 동의가 아님을 주지시키고, 회의 중 반드시 발언권을 강제로라도 부여하세요.",
      "뒤에서 하는 말은 효력이 없으며, 오직 회의록에 남은 말만 유효함을 선언하세요.",
      "수동적 공격성이 팀의 신뢰를 얼마나 갉아먹는지 직면(Face)시키세요."
    ]
  },
  'fragile-ego-feedback': {
    statusSummary: {
      psychState: "작은 피드백에도 인격적 공격을 받았다고 느끼며, 감정적으로 무너져 대화가 불가능해지는 상태",
      strengths: ["풍부한 감수성", "팀 분위기 메이커"],
      weaknesses: ["회복 탄력성 부족", "과도한 일반화"],
      performance: ["2023: 준수(B+)", "2024: 보통(B)", "2025: 보통(B)"]
    },
    competencyData: { performance: 75, stress: 85, potential: 70, loyalty: 80, communication: 70 },
    idealState: "리더의 피드백이 '개인적 공격(Personal Attack)'이 아니라 '성장을 위한 챌린지'임을 신뢰하게 된 상태",
    theory: "피드백 회복 탄력성",
    tasks: [
      "'당신을 인간적으로 아끼기 때문에' 하기 힘든 말을 한다는 진정성을 먼저 전하세요.",
      "눈물이나 감정 호소에 당황하여 피드백을 철회하거나 톤을 낮추지 마세요.",
      "감정이 가라앉을 시간을 주되, 피드백의 내용은 끝까지 전달하세요."
    ]
  },
  'selective-work-allergy': {
    statusSummary: {
      psychState: "화려하고 노출이 많은 업무(발표, 기획 등)에는 열의를 보이나, 팀 운영을 위한 기초 업무나 궂은 일은 숙련도 부족을 핑계로 교묘히 회피하는 '체리피킹(Cherry-picking)' 상태",
      strengths: ["탁월한 성과 마케팅", "핵심 임원과의 네트워킹", "프레젠테이션 스킬"],
      weaknesses: ["무임승차 태도", "데이터 정리 등 기초 작업 소홀", "동료간 업무 불균형 야기"],
      performance: ["2023: 보통(B)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 85, stress: 20, potential: 70, loyalty: 30, communication: 90 },
    history: [
      { type: "회의 참여", text: "팀장님, 그 전략 분석은 제가 할게요. 근데 자료 조사는 다른 분이 좀 해주셔야 할 것 같아요.", date: "2026.02.10" },
      { type: "피드백 영수", text: "왜 제가 이런 단순 반복 업무까지 해야 하는지 모르겠네요. 제 역량 낭비 아닌가요?", date: "2026.01.25" }
    ],
    idealState: "화려한 성과뿐만 아니라, 보이지 않는 곳에서의 기여가 팀워크의 근간임을 인정하고, 공평한 업무 분담에 동의한 상태",
    theory: "협업 엔지니어링 모델",
    tasks: [
      "성과 평가에 '동료 지원'과 '협업 태도'가 실질적인 데이터로 반영됨을 명확히 고지하세요.",
      "그의 행동이 팀 전체의 사기(Morale)에 미치는 악영향을 냉정하게 데이터로 제시하세요.",
      "생색나는 일 대신, 팀에 꼭 필요하지만 아무도 안 하려는 일을 맡겨 리더십 자질을 테스트하세요."
    ]
  },
  'growth-refusal': {
    statusSummary: {
      psychState: "현재 자신의 역량에 안주하며, 새로운 기술이나 변화된 환경에 적응하기를 완강히 거부하는 상태",
      strengths: ["기존 도메인 숙련", "우직함"],
      weaknesses: ["학습 민첩성 저조", "고정 마인드셋"],
      performance: ["2023: 우수(A)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 70, stress: 50, potential: 20, loyalty: 90, communication: 60 },
    idealState: "현재의 전문성을 유지하기 위해서라도 새로운 학습이 필수적임을 깨닫고, 최소한의 변화를 수용한 상태",
    theory: "Lifelong Learning 모델",
    tasks: [
      "안주하는 것은 현상 유지가 아니라 도태되는 것임을 업계 변화를 들어 설명하세요.",
      "거창한 목표 대신, 부담 없이 시도할 수 있는 마이크로 러닝을 제안하세요.",
      "변화를 거부하는 것이 후배들에게 부정적 롤모델이 됨을 상기시키세요."
    ]
  },
  'side-project-overload': {
    statusSummary: {
      psychState: "본업보다 부업(사이드 프로젝트)에 더 많은 에너지를 쏟고 있으며, 근무 시간 중에도 집중하지 못하는 상태",
      strengths: ["높은 주도성", "다양한 경험"],
      weaknesses: ["본업 몰입도 결여", "전문성 분산"],
      performance: ["2023: 우수(A)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 60, stress: 50, potential: 90, loyalty: 20, communication: 80 },
    idealState: "근무 시간에는 본업에 100% 몰입(Deep Work)하고, 부업은 철저히 업무 외 시간으로 분리하기로 약속한 상태",
    theory: "Deep Work & Focus Management",
    tasks: [
      "개인의 경제 활동은 존중하되, 근로 계약상의 '성실 의무' 위반은 묵과할 수 없음을 경고하세요.",
      "업무 집중도 저하가 동료들에게 피해를 주고 있음을 팩트로 지적하세요.",
      "본업에서의 성과가 부업(퍼스널 브랜딩)에도 도움이 됨을 연결시키세요."
    ]
  },
  'stealing-credit-misconception': {
    statusSummary: {
      psychState: "리더가 자신의 아이디어나 성과를 가로채간다고 오해하며, 피해 의식과 강한 반발심을 가진 상태",
      strengths: ["창의적 아이디어", "강한 소유권"],
      weaknesses: ["피해 망상", "신뢰 부재"],
      performance: ["2023: 준수(B+)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 85, stress: 80, potential: 80, loyalty: 30, communication: 30 },
    idealState: "팀장의 역할이 '성과 가로채기'가 아닌 '성과의 판을 깔아주는 것'임을 이해하고, 오해를 푼 상태",
    theory: "서번트 리더십(Servant Leadership)",
    tasks: [
      "팀 전체 성과 보고 프로세스를 투명하게 공개하여 불신을 해소하세요.",
      "상위 리더에게 해당 팀원의 기여를 구체적으로 언급했음을 증명하세요.",
      "피해 망상적 사고를 팩트로 교정해주되, 그만큼 인정받고 싶어하는 열망은 칭찬하세요."
    ]
  },
  'informal-leader': {
    statusSummary: {
      psychState: "팀 내에서 공식 리더보다 더 강력한 영향력을 행사하며, 은근히 리더의 권위에 도전하는 상태",
      strengths: ["강력한 여론 주도", "동료 신뢰"],
      weaknesses: ["비공식 권력 남용", "조직 체계 교란"],
      performance: ["2023: 우수(A)", "2024: 우수(A)", "2025: 보통(B)"]
    },
    competencyData: { performance: 90, stress: 40, potential: 85, loyalty: 40, communication: 90 },
    idealState: "비공식적 영향력을 리더십에 대항하는 데 쓰지 않고, 팀장을 보좌하여 팀을 이끄는 데 쓰기로 협력한 상태",
    theory: "비공식 리더십 매니지먼트",
    tasks: [
      "그의 영향력을 인정해주고, 공식적인 '파트너'로서 존중을 표하세요.",
      "뒤에서 흔드는 대신 앞에서 공식적으로 의견을 개진해달라고 요청하세요.",
      "당신의 권위에 도전하는 것은 팀 전체의 혼란을 야기함을 단호히 경고하세요."
    ]
  },
  'selective-honesty': {
    statusSummary: {
      psychState: "솔직함이라는 명목 하에 동료들에게 무례한 언행을 일삼으며, 자신의 태도가 문제임을 인지하지 못하는 상태",
      strengths: ["직설적 정보 전달", "명확성"],
      weaknesses: ["공감 지수 제로", "팀 분위기 경색"],
      performance: ["2023: 준수(B+)", "2024: 보통(B)", "2025: 보통(B)"]
    },
    competencyData: { performance: 75, stress: 30, potential: 60, loyalty: 70, communication: 10 },
    idealState: "무례함과 솔직함의 차이를 인지하고, 할 말은 하되 상대를 배려하는 화법(Filter)을 갖추기로 한 상태",
    theory: "건설적 솔직함(Radical Candor)",
    tasks: [
      "'솔직함'이 면죄부가 될 수 없으며, 의도가 좋아도 결과가 나쁘면 소통 실패임을 지적하세요.",
      "상처받은 동료들의 입장을 역지사지로 생각해보게 질문하세요.",
      "쿠션 언어와 건설적 피드백 화법을 구체적으로 가르치세요."
    ]
  },
  'tmi-energy-drainer': {
    statusSummary: {
      psychState: "공적인 자리에서도 지나치게 사적인 감정과 사정을 늘어놓아 동료들의 업무 집중도를 떨어뜨리는 상태",
      strengths: ["친화력", "감정 표현"],
      weaknesses: ["공사 구분 결여", "시간 관리 미흡"],
      performance: ["2023: 보통(B)", "2024: 준수(B+)", "2025: 보통(B)"]
    },
    competencyData: { performance: 65, stress: 70, potential: 50, loyalty: 80, communication: 95 },
    idealState: "직장은 심리 상담소가 아님을 인지하고, 사적인 감정 토로를 자제하며 업무 페르소나를 장착한 상태",
    theory: "직업적 경계 설정 이론",
    tasks: [
      "팀원의 힘듦에는 공감하지만, 업무 시간의 감정 토로는 프로답지 않음을 선을 그으세요.",
      "동료들이 그의 감정 쓰레기통이 되어 지쳐가고 있음을 직면시키세요.",
      "업무 몰입을 통해 개인사를 잠시 잊는 것이 오히려 도움이 됨을 조언하세요."
    ]
  },
  'emotional-rollercoaster': {
    statusSummary: {
      psychState: "감정의 기복이 매우 심하여 그날의 기분에 따라 업무 성과와 협업 태도가 극단적으로 갈리는 상태",
      strengths: ["높은 몰입 시 폭발적 성과", "열정"],
      weaknesses: ["감정 자제력 부족", "예측 불가능한 행동"],
      performance: ["2023: 우수(A)", "2024: 미흡(C)", "2025: 보통(B)"]
    },
    competencyData: { performance: 75, stress: 90, potential: 80, loyalty: 60, communication: 40 },
    idealState: "자신의 기분 변화를 스스로 모니터링하고, 부정적 감정이 태도로 드러나지 않도록 자기 조절(Self-Regulation)하는 상태",
    theory: "Self-Regulation(자기 조절)",
    tasks: [
      "기분이 태도가 되는 것은 아마추어의 전형적인 특징임을 따끔하게 지적하세요.",
      "감정이 격해질 때는 잠시 자리를 비우는 등의 '타임아웃' 규칙을 정하세요.",
      "일관성 있는 태도가 곧 신뢰(Trust)임을 강조하세요."
    ]
  },
};

const DEFAULT_BRIEFING: MissionBriefing = {
  statusSummary: {
    psychState: "현재 자신의 업무 상황에 대해 특별한 이슈를 느끼지 못하는 상태",
    strengths: ["무난한 협업 능력", "주어진 업무 이행"],
    weaknesses: ["주도성 부족", "창의적 대안 제시 미흡"],
    performance: ["최근 3년 평균: 보통(B)"]
  },
  competencyData: { performance: 70, stress: 40, potential: 60, loyalty: 70, communication: 70 },
  history: [
    { type: "MONTHLY TALK", text: "맡겨진 일은 잘 하고 계시네요. 조금 더 주도적으로 해보세요.", date: "2026.01.20" }
  ],
  idealState: "팀원의 현재 역량(Competence)과 의욕(Commitment) 수준에 맞는 리더십을 적용하여, 목표 달성에 합의한 상태",
  theory: "리더십 상황 이론",
  tasks: [
    "팀원의 현 상태를 진단하고 지시/코칭/지원/위임 중 가장 적절한 태도를 취하세요.",
    "리더의 기대치(Expectation)를 구체적인 행동 언어로 전달하세요.",
    "정기적인 피드백 루프를 만들기로 합의하여 지속적인 관심을 약속하세요."
  ]
};

export function getMissionBriefing(scenarioId?: string): MissionBriefing {
  if (!scenarioId) return DEFAULT_BRIEFING;
  return MISSION_BRIEFINGS[scenarioId] || DEFAULT_BRIEFING;
}

const OPENING_LINES: Record<string, string> = {
  'late-comer': "아... 네 팀장님. (시계를 슬쩍 보며) 무슨 일이세요? 저 지금 급하게 처리할 게 있어서...",
  'team-clash': "(모니터에서 눈을 떼지 않으며) 네, 말씀하세요. 저도 제 방식이 있는 건데, 또 그 이야기시라면 길게 듣고 싶지 않네요.",
  'boundaries': "지금 6시 넘었는데요. 업무 이야기면 내일 하시죠? 저 약속 있어서요.",
  'feedback-defense': "네? 저번 오류는 제 탓이 아니라고 분명 말씀드렸는데요. 가이드가 불명확했던 게 문제였잖아요.",
  'low-motivation': "(힘없는 목소리로) ...네. 무슨 일이시죠. 하라면 해야죠...",
  'change-resistance': "에이, 팀장님. 그 새로운 툴인가 뭔가 그거 꼭 써야 합니까? 예전 방식이 훨씬 빠른데.",
  'promotion-fail': "할 말 없습니다. 제가 부족해서 떨어진 건데 무슨 위로가 필요하겠어요. 일이나 할게요.",
  'quiet-quitting': "네. 지시하실 거 있으면 메신저로 남겨주세요. 제 R&R 범위 내라면 처리하겠습니다.",
  'micro-management': "아, 또 확인하시게요? 저 좀 믿고 맡겨주시면 안 되나요? 숨 막혀서 일 못하겠네요.",
  'skill-gap': "팀장님! 저 이번 프로젝트 진짜 열심히 하고 있는 거 아시죠? 결과물 대박 날 겁니다. 믿어주세요!",
  'remote-isolation': "(카메라를 끈 채로) ...여보세요? 네, 듣고 있어요. 용건만 간단히 말씀해주세요.",
  'inter-gen-clash': "팀장님, 저 진짜 억울해요. 제가 부장님 무시한 게 아니라, 말이 안 통하니까 답답해서 그런 거죠.",
  'over-commitment': "네 팀장님! 아, 옆 팀 요청 처리하느라 좀 바쁜데... 그래도 팀장님 말씀이니까 시간 내야죠. 뭡니까?",
  'negativity-virus': "아휴, 회사가 또 이상한 거 시키나요? 우리 팀만 죽어라 고생하고... 진짜 답도 없네요.",
  'career-pivot': "네. 안 그래도 드릴 말씀 있었는데. 저 이 직무랑 진짜 안 맞는 것 같아요.",
  'transparency-demand': "팀장님, 저 평가 결과 납득 못 하겠습니다. 구체적인 산정 데이터 엑셀로 지금 바로 보내주세요.",
  'quality-vs-speed': "마감이 중요해요? 퀄리티가 중요하죠. 대충 해서 낼 거면 전 이름 빼겠습니다.",
  'hidden-agenda': "글쎄요. 저는 팀을 위해서 그런 건데... 다른 사람들이 오해하는 거 아닐까요?",
  'recognition-starve': "팀장님! 저 이번에 밤새서 한 거 보셨죠? 잘했죠? 네? 피드백 좀 빨리 주세요.",
  'tech-debt': "이 코드로는 배포 못 합니다. 리팩토링 안 시켜주시면 저 그냥 손 뗄게요. 나중에 터지면 책임 지실 거예요?",
  'passive-aggressive-meeting': "(무표정하게) 네. 말씀하세요. 회의 때는 다 동의했잖아요. 뒤에서 딴소리한 적 없습니다.",
  'fragile-ego-feedback': "지금... 저 혼내시는 거예요? 제가 그렇게 못했나요? (울먹이며) 진짜 너무하시네요...",
  'selective-work-allergy': "아, 그 서류 정리요? 그건 막내 시키죠. 저는 지금 임원 보고용 장표 만드느라 바빠서요.",
  'growth-refusal': "저 지금 하는 일만으로도 벅차요. 새로운 거 배울 여력 없습니다. 그냥 하던 거 하게 해주세요.",
  'side-project-overload': "잠시만요, (폰을 끄며) 네. 급한 개인 용무가 있어서요. 업무 지시 사항인가요?",
  'stealing-credit-misconception': "제 아이디어였잖아요. 왜 팀장님이 보고할 때 제 이름 뺐어요? 진짜 실망입니다.",
  'informal-leader': "팀장님, 잘 모르셔서 그러는데 우리 팀은 원래 이렇게 안 해요. 애들이 다 제 말 따르니까 저한테 맡기시죠.",
  'selective-honesty': "제가 틀린 말 했나요? 못하니까 못한다고 한 건데, 상처받는 게 이상한 거죠. 전 솔직한 편이라서요.",
  'tmi-energy-drainer': "팀장님, 저 어제 진짜 대박 사건 있었잖아요. 남친이랑 헤어졌는데... (10분째 개인사 이야기 중)",
  'emotional-rollercoaster': "(싸늘하게) 건드리지 마세요. 저 오늘 기분 진짜 별로니까.",
};

export function getOpeningLine(scenarioId?: string, name?: string): string {
  if (scenarioId && OPENING_LINES[scenarioId]) return OPENING_LINES[scenarioId];
  return `네, ${name || '팀원'}입니다. 무슨 일이시죠?`;
}
