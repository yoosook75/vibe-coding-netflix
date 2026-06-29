const NOTICE_LIST = [
  {
    id: 49,
    pinned: true,
    title: '홈페이지 시스템 작업으로 인한 예매서비스 이용 일시 중단 안내',
    date: '2026.06.21',
    hasAttachment: true,
    views: 312,
    paragraphs: [
      '안녕하세요. YSCine입니다.',
      '홈페이지 시스템 점검 작업으로 인해 아래 기간 동안 예매 서비스 이용이 일시 중단됩니다.',
      '■ 작업 일시: 2026년 6월 22일(일) 02:00 ~ 06:00',
      '■ 중단 서비스: 홈페이지·모바일 예매, 회원 로그인',
      '작업 시간은 상황에 따라 변경될 수 있으며, 이용에 불편을 드려 죄송합니다.',
    ],
  },
  {
    id: 48,
    pinned: true,
    title: '영화관람 활성화 지원사업(6,000원 할인권) YSCine 적용 안내',
    date: '2026.06.18',
    hasAttachment: true,
    views: 428,
    paragraphs: [
      '영화관람 활성화 지원사업 할인권이 YSCine에서 적용됩니다.',
      '■ 할인 금액: 1인 6,000원',
      '■ 적용 대상: 지원사업 참여 영화 및 상영 회차',
      '■ 이용 방법: 현장 매표소 또는 키오스크에서 할인권 바코드 제시',
      '자세한 적용 영화 목록은 첨부 파일을 참고해 주세요.',
    ],
  },
  {
    id: 47,
    pinned: true,
    title: 'YSCine 입장수칙 변경 - 상영관 내부 음료 반입 허용 안내',
    date: '2026.06.10',
    hasAttachment: false,
    views: 567,
    paragraphs: [
      'YSCine 입장 수칙이 일부 변경됩니다.',
      '2026년 6월 15일부터 상영관 내부 음료 반입이 허용됩니다. 단, 뚜껑이 있는 음료에 한하며 음식 반입은 기존과 동일하게 제한됩니다.',
      '쾌적한 관람 환경을 위해 음료 반입 시 반드시 뚜껑을 닫아 주시기 바랍니다.',
    ],
  },
  {
    id: 46,
    title: '2026년 7월 상영 일정 변경 안내',
    date: '2026.06.05',
    hasAttachment: false,
    views: 189,
    paragraphs: [
      '2026년 7월 상영 일정이 일부 변경되었습니다.',
      '변경된 상영 시간표는 홈페이지 영화 메뉴에서 확인하실 수 있습니다.',
    ],
  },
  {
    id: 45,
    title: '여름 시즌 멤버십 혜택 안내',
    date: '2026.05.28',
    hasAttachment: true,
    views: 245,
    paragraphs: [
      '여름 시즌 멤버십 회원을 위한 특별 혜택을 안내드립니다.',
      '■ 기간: 2026년 6월 1일 ~ 8월 31일',
      '■ 혜택: 주중 상영 2,000원 할인, 음료 10% 할인',
      '멤버십 가입은 로비 안내 데스크에서 가능합니다.',
    ],
  },
  {
    id: 44,
    title: '개인정보 처리방침 개정 안내',
    date: '2026.05.20',
    hasAttachment: true,
    views: 156,
    paragraphs: [
      '개인정보 처리방침이 개정되어 2026년 6월 1일부터 시행됩니다.',
      '주요 변경 사항은 첨부된 개정 전·후 대조표를 참고해 주세요.',
    ],
  },
  {
    id: 43,
    title: 'YSCine 앱 업데이트 안내 (v2.1)',
    date: '2026.05.15',
    hasAttachment: false,
    views: 203,
    paragraphs: [
      'YSCine 모바일 앱 v2.1이 출시되었습니다.',
      '예매 내역 조회 속도 개선 및 푸시 알림 기능이 추가되었습니다. 앱 스토어에서 최신 버전으로 업데이트해 주세요.',
    ],
  },
  {
    id: 42,
    title: '5월 휴무일 안내',
    date: '2026.05.01',
    hasAttachment: false,
    views: 134,
    paragraphs: [
      '5월 정기 휴무일을 안내드립니다.',
      '■ 휴무일: 2026년 5월 5일(월) — 시설 점검',
      '휴무일에는 상영 및 예매 서비스가 운영되지 않습니다.',
    ],
  },
  {
    id: 41,
    title: '봄 시즌 이벤트 당첨자 발표',
    date: '2026.04.25',
    hasAttachment: true,
    views: 378,
    paragraphs: [
      '봄 시즌 이벤트 당첨자를 발표합니다.',
      '당첨자 명단은 첨부 파일을 확인해 주시기 바랍니다. 경품 수령은 2026년 5월 10일까지 로비 안내 데스크에서 가능합니다.',
    ],
  },
  {
    id: 40,
    title: '서울영화센터 7월 교육 안내',
    date: '2026.04.18',
    hasAttachment: true,
    views: 167,
    paragraphs: [
      '서울영화센터 7월 교육 프로그램을 안내드립니다.',
      '신청 기간 및 커리큘럼은 첨부 파일을 참고해 주세요.',
    ],
  },
  {
    id: 39,
    title: '상영관 좌석 배치 변경 안내',
    date: '2026.04.10',
    hasAttachment: false,
    views: 221,
    paragraphs: [
      '일부 상영관 좌석 배치가 변경되었습니다.',
      '예매 시 좌석 배치도를 확인해 주시기 바랍니다.',
    ],
  },
  {
    id: 38,
    title: '주차장 이용 요금 변경 안내',
    date: '2026.04.02',
    hasAttachment: false,
    views: 198,
    paragraphs: [
      '주차장 이용 요금이 2026년 4월 10일부터 변경됩니다.',
      '■ 변경 후 요금: 최초 3시간 무료, 이후 30분당 1,000원',
    ],
  },
  {
    id: 37,
    title: '4월 시사회 참가 신청 안내',
    date: '2026.03.28',
    hasAttachment: true,
    views: 289,
    paragraphs: [
      '4월 시사회 참가 신청을 받습니다.',
      '신청 방법 및 일정은 첨부 파일을 확인해 주세요.',
    ],
  },
  {
    id: 36,
    title: '회원 등급 제도 개편 안내',
    date: '2026.03.20',
    hasAttachment: true,
    views: 412,
    paragraphs: [
      '회원 등급 제도가 개편됩니다.',
      '2026년 4월 1일부터 새로운 등급 기준이 적용되며, 자세한 내용은 첨부 파일을 참고해 주세요.',
    ],
  },
  {
    id: 35,
    title: '설 연휴 운영 시간 안내',
    date: '2026.02.05',
    hasAttachment: false,
    views: 176,
    paragraphs: [
      '설 연휴 기간 운영 시간을 안내드립니다.',
      '■ 연휴 기간: 2026년 2월 7일 ~ 2월 9일',
      '■ 운영 시간: 10:00 ~ 22:00 (평소와 동일)',
    ],
  },
];

function sortNotices(list) {
  return [...list].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.id - a.id;
  });
}
