-- ════════════════════════════════════════
-- 사자성어 난이도 재배정 마이그레이션
-- 기존 DB에 실행하세요 (오답 데이터 유지됨)
-- ════════════════════════════════════════

-- ── 초급 Set 1 ──
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '일석이조';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '자업자득';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '이심전심';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '삼삼오오';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '우왕좌왕';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '다다익선';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '반신반의';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '동문서답';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '좌충우돌';
UPDATE korean_idioms SET level = 'beginner', set_no = 1 WHERE idiom = '고진감래';

-- ── 초급 Set 2 ──
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '유비무환';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '전화위복';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '대기만성';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '일취월장';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '일사천리';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '좌지우지';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '금상첨화';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '십시일반';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '백문불여일견';
UPDATE korean_idioms SET level = 'beginner', set_no = 2 WHERE idiom = '상부상조';  -- 고급→초급

-- ── 중급 Set 1 ──
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '과유불급';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '구사일생';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '설상가상';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '이구동성';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '자포자기';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '속수무책';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '다사다난';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '오리무중';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '우후죽순';
UPDATE korean_idioms SET level = 'intermediate', set_no = 1 WHERE idiom = '청출어람';

-- ── 중급 Set 2 ──
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '사면초가';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '어부지리';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '조삼모사';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '사필귀정';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '새옹지마';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '동병상련';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '노심초사';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '와신상담';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '우이독경';
UPDATE korean_idioms SET level = 'intermediate', set_no = 2 WHERE idiom = '배수진';

-- ── 중급 Set 3 ──  (고급→중급으로 이동한 성어들)
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '감언이설';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '견물생심';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '고군분투';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '기사회생';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '마이동풍';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '적반하장';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '침소봉대';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '임기응변';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '화룡점정';
UPDATE korean_idioms SET level = 'intermediate', set_no = 3 WHERE idiom = '선견지명';

-- ── 고급 Set 1 ──  (중급→고급으로 이동한 성어들)
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '오합지졸';  -- 초급→고급
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '각주구검';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '호가호위';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '결초보은';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '권토중래';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '문전성시';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '부화뇌동';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '진퇴양난';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '풍전등화';
UPDATE korean_idioms SET level = 'advanced', set_no = 1 WHERE idiom = '부지기수';

-- ── 고급 Set 2 ──
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '수수방관';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '일맥상통';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '허심탄회';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '사생결단';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '불철주야';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '형설지공';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '절차탁마';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '난형난제';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '각골난망';
UPDATE korean_idioms SET level = 'advanced', set_no = 2 WHERE idiom = '백골난망';

-- ── 고급 Set 3 ──
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '교학상장';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '명경지수';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '언중유골';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '자가당착';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '자승자박';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '전전긍긍';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '주마간산';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '혼정신성';
UPDATE korean_idioms SET level = 'advanced', set_no = 3 WHERE idiom = '환골탈태';

-- ── 와해(2글자) → 고장난명(4글자)으로 교체 ──
UPDATE korean_idioms SET
  idiom = '고장난명',
  hanja = '孤掌難鳴',
  meaning = '외손뼉은 울리기 어렵다는 뜻으로, 혼자의 힘만으로는 일을 이루기 어려움',
  char_meanings = '{"고":"외로울 고(孤)","장":"손바닥 장(掌)","난":"어려울 난(難)","명":"울릴 명(鳴)"}',
  level = 'advanced',
  set_no = 3,
  example_sentence = '고장난명이라, 아무리 뛰어난 사람도 혼자서는 큰 일을 이루기 어렵다.',
  origin = NULL
WHERE idiom = '와해';
