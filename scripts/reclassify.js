const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://khvykbfdbaeavsxbmexy.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodnlrYmZkYmFlYXZzeGJtZXh5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE3MTI1MywiZXhwIjoyMDg5NzQ3MjUzfQ.jP36lQjrFdQXmh1ni1n7YkrTFN1BI3tEIPT4cXuOLZA'
);

// ═══════════════════════════════════════════════════════
// 국어교육학 기준 재분류 & 세트 내 난이도 정렬
// 10개씩 set 1(가장 쉬움) → set 10(가장 어려움)
// ═══════════════════════════════════════════════════════

const beginner = [
    '모순', '일석이조', '자업자득', '동문서답', '이심전심',
    '고진감래', '일거양득', '동고동락', '자급자족', '반신반의',
    '우왕좌왕', '좌충우돌', '좌지우지', '역지사지', '온고지신',
    '대기만성', '유비무환', '인지상정', '전화위복', '백전백승',
    '위풍당당', '의기양양', '천고마비', '인산인해', '금상첨화',
    '일사천리', '일취월장', '일편단심', '약육강식', '동상이몽',
    '자화자찬', '십시일반', '단도직입', '남부여대', '독불장군',
    '비일비재', '본말전도', '이실직고', '반면교사', '시시비비',
    '천방지축', '유유자적', '학수고대', '요지부동', '두문불출',
    '천군만마', '호시탐탐', '포복절도', '박학다식', '이판사판',
    '외유내강', '내유외강', '기고만장', '횡설수설', '표리부동',
    '현모양처', '후회막급', '소탐대실', '주객전도', '적소성대',
    '자중지란', '초지일관', '태연자약', '방약무인', '안하무인',
    '허장성세', '혼비백산', '안분지족', '자포자기', '상부상조',
    '유유상종', '내우외환', '어불성설', '전도유망', '우유부단',
    '죽마고우', '선공후사', '신상필벌', '권선징악', '위기일발',
    '과유불급', '설상가상', '구사일생', '이구동성', '다사다난',
    '감개무량', '명불허전', '천신만고', '불가사의', '오매불망',
    '유일무이', '철두철미', '혼연일체', '후안무치', '유구무언',
    '차일피일', '주야장천', '일구이언', '중언부언', '함구무언',
];

const intermediate = [
    '속수무책', '오리무중', '우후죽순', '청출어람', '사필귀정',
    '동병상련', '배은망덕', '결자해지', '견물생심', '고군분투',
    '기사회생', '마이동풍', '임기응변', '적반하장', '침소봉대',
    '선견지명', '감언이설', '문전성시', '호가호위', '결초보은',
    '와신상담', '사면초가', '조삼모사', '어부지리', '우이독경',
    '삼고초려', '관포지교', '토사구팽', '화룡점정', '새옹지마',
    '부화뇌동', '진퇴양난', '풍전등화', '탁상공론', '파죽지세',
    '아전인수', '지성감천', '교각살우', '목불인견', '배수진',
    '각골난망', '괄목상대', '일맥상통', '수수방관', '조령모개',
    '조변석개', '일망타진', '분골쇄신', '전대미문', '권토중래',
    '근묵자흑', '금의환향', '기상천외', '군계일학', '구우일모',
    '산전수전', '상전벽해', '무릉도원', '점입가경', '초록동색',
    '타산지석', '함흥차사', '사상누각', '살신성인', '불치하문',
    '갑론을박', '거두절미', '격세지감', '불문곡직', '식자우환',
    '고립무원', '고육지책', '환골탈태', '백골난망', '절치부심',
    '형설지공', '암중모색', '순망치한', '교언영색', '구밀복검',
    '면종복배', '금과옥조', '낭중지추', '도로무공', '오월동주',
    '일사불란', '촌철살인', '허심탄회', '견강부회', '이전투구',
    '부창부수', '혈혈단신', '자격지심', '녹음방초', '백문불여일견',
    '연목구어', '언어도단', '수어지교', '견마지로', '발본색원',
];

const advanced = [
    // Set 1 — 비교적 알려진 고급 표현
    '등용문', '막역지우', '사생결단', '불철주야', '부지기수',
    '우공이산', '장본인', '백미', '화복', '노심초사',
    // Set 2 — 교양 수준 고사성어
    '오합지졸', '각주구검', '난형난제', '주마간산', '절차탁마',
    '자가당착', '교학상장', '고장난명', '언중유골', '권모술수',
    // Set 3 — 고사 배경 필요
    '가인박명', '양두구육', '의심암귀', '지록위마', '황당무계',
    '호사다마', '전전긍긍', '자승자박', '혹세무민', '회자정리',
    // Set 4 — 한문 독해력 필요
    '파천황', '미봉책', '여반장', '호구지책', '가담항설',
    '안빈낙도', '감탄고토', '지행합일', '지기지우', '명경지수',
    // Set 5
    '창해일속', '백척간두', '반포지효', '풍수지탄', '천우신조',
    '명재경각', '전무후무', '전전반측', '욱일승천', '고복격양',
    // Set 6
    '천양지차', '운니지차', '견리망의', '골육상쟁', '수적천석',
    '금지옥엽', '경국지색', '언감생심', '불문가지', '중구난마',
    // Set 7 — 전고 기반, 드문 사용
    '겸양지덕', '경이원지', '격화소양', '정저와상', '이대도강',
    '백년하청', '권불십년', '무불통지', '천의무봉', '천재일우',
    // Set 8 — 매우 어려운 한자
    '천석고황', '음풍농월', '혼정신성', '염화미소', '요산요수',
    '백아절현', '경당문노', '애걸복걸', '인자무적', '곡학아세',
    // Set 9
    '당구풍월', '견위수명', '등화가친', '원화소복', '도청도설',
    '득롱망촉', '망양보뢰', '망양지탄', '한강투석', '오비이락',
    // Set 10 — 가장 난해한 표현
    '맥수지탄', '동가홍상', '숙맥불변', '빈자일등', '빙탄지간',
    '삼순구식', '박이부정', '오비삼척', '단사표음', '우수마발',
];

async function main() {
    const { data: allIdioms } = await supabase
        .from('korean_idioms')
        .select('id, idiom')
        .order('id');

    const nameToId = Object.fromEntries(allIdioms.map(i => [i.idiom, i.id]));
    const allNames = new Set(allIdioms.map(i => i.idiom));

    // 검증
    const allClassified = [...beginner, ...intermediate, ...advanced];
    const classifiedSet = new Set(allClassified);

    if (allClassified.length !== 300) {
        console.log('ERROR: Total classified =', allClassified.length, '(expected 300)');
        return;
    }
    if (classifiedSet.size !== 300) {
        // 중복 찾기
        const seen = new Set();
        for (const name of allClassified) {
            if (seen.has(name)) console.log('DUPLICATE:', name);
            seen.add(name);
        }
        return;
    }
    for (const name of allClassified) {
        if (!allNames.has(name)) {
            console.log('NOT IN DB:', name);
            return;
        }
    }
    const missing = [...allNames].filter(n => !classifiedSet.has(n));
    if (missing.length > 0) {
        console.log('MISSING FROM CLASSIFICATION:', missing);
        return;
    }

    console.log('✓ Validation passed: 300 idioms, no duplicates, no missing');
    console.log(`  Beginner: ${beginner.length}, Intermediate: ${intermediate.length}, Advanced: ${advanced.length}`);

    // DB 업데이트
    const updates = [];

    function addUpdates(list, level) {
        list.forEach((name, idx) => {
            const setNo = Math.floor(idx / 10) + 1;
            const id = nameToId[name];
            updates.push({ id, level, set_no: setNo });
        });
    }

    addUpdates(beginner, 'beginner');
    addUpdates(intermediate, 'intermediate');
    addUpdates(advanced, 'advanced');

    console.log(`\nUpdating ${updates.length} rows...`);

    let success = 0;
    let fail = 0;
    for (const u of updates) {
        const { error } = await supabase
            .from('korean_idioms')
            .update({ level: u.level, set_no: u.set_no })
            .eq('id', u.id);
        if (error) {
            console.log('FAIL:', u, error.message);
            fail++;
        } else {
            success++;
        }
    }

    console.log(`\n✓ Done: ${success} updated, ${fail} failed`);

    // 결과 확인
    const { data: check } = await supabase
        .from('korean_idioms')
        .select('level, set_no')
        .order('level')
        .order('set_no');

    const summary = {};
    check.forEach(r => {
        const key = `${r.level} set ${r.set_no}`;
        summary[key] = (summary[key] || 0) + 1;
    });
    console.log('\n=== 최종 분포 ===');
    Object.entries(summary).sort().forEach(([k, v]) => console.log(`${k}: ${v}개`));
}

main();
