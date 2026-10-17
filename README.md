# PT & Pilates IN BLUE — 홍보 홈페이지

체형교정 · 재활 전문 스튜디오 **IN BLUE**(장안점 · 성내점)의 홍보 웹사이트입니다.
별도 서버나 설치 없이 `index.html` 을 더블클릭하면 바로 열립니다.

---

## 1. 페이지 구성

| 파일 | 메뉴 | 내용 |
|---|---|---|
| `index.html` | Introduction to IN BLUE / 인블루 소개 | 브랜드 소개, 3대 프로그램(PILATES + PT + CONDITIONING), 50분 수업 흐름 |
| `branch.html` | Branch Introduction / 지점소개 | 상단 탭으로 **장안점 / 성내점** 전환, 시설 사진·특징·보유 기구 |
| `instructor.html` | Instructor Introduction / 강사소개 | 상단 탭으로 지점 전환, 임도영 대표(장안) · 신승현 대표(성내) 자격/경력 |
| `before-after.html` | Before & After / 비포애프터 | 프로그램 4종, BEFORE → PROCESS → AFTER, 변화 슬라이더, 사례 카드 |
| `reservation.html` | Reservation / 일일 체험 예약 | CHOOSE YOUR STUDIO, 지점별 사진·강사·네이버 플레이스, **상담 예약 폼** |
| `admin.html` | (비공개) | 접수된 상담 문의 확인 · 전화 연결 · 상태 관리 |

상단 네비게이션은 스크롤해도 화면 위에 고정되며, 메뉴마다 영문 아래 한글 라벨이 함께 표시됩니다.

---

## 2. 상담 예약 → 관리자 연동

1. 방문자가 `reservation.html` 에서 **상담 예약하기** 를 누르면 입력 폼이 열립니다.
   - 지점 선택 / 이름(직접 입력) / 전화번호(**010 고정 + 뒤 8자리**) / 나이(숫자 선택)
   - 관심 프로그램 · 통화 가능 시간 · 문의 내용 · 개인정보 동의
2. 접수되면 데이터가 즉시 `admin.html` 로 전달됩니다.
3. `admin.html` 우측 상단 **벨 아이콘**에 오늘 접수 건수가 뱃지로 표시됩니다.
   - 1 ~ 99 까지는 숫자 그대로, 100건 이상이면 **99+** 로 표기
   - 새 문의가 들어오면 벨이 흔들리고 하단에 알림이 뜹니다
4. 목록에서 행을 클릭하면 상세 패널이 열리고, **전화 걸기** 버튼으로 바로 통화할 수 있습니다.
5. 필터(전체/신규/완료/지점별), 이름·번호 검색, **CSV 내려받기** 를 지원합니다.

> **테스트 방법**
> `reservation.html` 과 `admin.html` 을 같은 브라우저의 **두 탭**으로 함께 열어두고
> 예약을 넣어보면, 관리자 화면 숫자가 실시간으로 올라가는 것을 볼 수 있습니다.

### ⚠️ 데이터 저장 방식 (실제 운영 전 확인해 주세요)

현재 문의 데이터는 **보는 사람의 브라우저 안(localStorage)** 에 저장됩니다.
서버 없이 동작하도록 만든 구조라서, 이대로 인터넷에 올리면

- 고객 PC에서 넣은 문의가 **매장 PC의 `admin.html` 에는 나타나지 않습니다.**
- 브라우저 데이터를 지우면 문의도 함께 사라집니다.
- `admin.html` 에 로그인 잠금이 없습니다.

실제 홍보용으로 배포하실 때는 아래 중 하나로 바꾸시면 됩니다.

| 방법 | 특징 |
|---|---|
| 구글 폼 / 네이버 폼 연동 | 가장 간단, 무료, 스프레드시트로 접수 관리 |
| 카카오톡 채널 상담 연결 | 고객 이탈이 가장 적음 |
| 서버(DB) 연동 | 지금 관리자 화면을 그대로 쓰면서 데이터만 서버로 이동 |

`assets/js/common.js` 의 `Store.add()` 한 곳만 서버 전송으로 바꾸면
나머지 화면은 수정 없이 그대로 동작합니다.

---

## 3. 폴더 구조

```
D:\PT\
├─ index.html
├─ branch.html
├─ instructor.html
├─ before-after.html
├─ reservation.html
├─ admin.html
└─ assets\
   ├─ css\common.css      디자인 시스템 (색상 · 타이포 · 공통 컴포넌트)
   ├─ js\common.js        스크롤 등장 효과 · 탭 · 확대보기 · 예약 데이터 처리
   └─ img\
      ├─ logo-mark.jpg / logo-full.jpg
      ├─ jangan-01 ~ 06         장안점 시설 사진
      ├─ seongnae-01 ~ 07       성내점 시설 사진
      ├─ instructor-lim.jpg     임도영 대표 프로필
      ├─ instructor-shin.jpg    신승현 대표 프로필
      └─ ba\                    ★ Before & After 사진 넣는 곳 (README.txt 참고)
```

---

## 4. 자주 바꾸게 되는 내용

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 운영 시간 | `branch.html` 의 `Hours` 줄 (지점별 각 1곳) |
| 전화번호 | 각 HTML 하단 footer, `tel:` 로 검색 |
| 네이버 플레이스 주소 | `branch.html`, `reservation.html` 의 `naver` 링크 |
| 보유 기구 목록 | `branch.html` 의 `equip__list` |
| 강사 자격 · 경력 | `instructor.html` 의 `cred` 영역 |
| 나이 선택 범위 | `reservation.html` 하단 스크립트 `for (var a = 14; a <= 80; a++)` |
| 브랜드 색상 | `assets/css/common.css` 맨 위 `:root` 의 `--navy`, `--mist`, `--sand` |

---

## 5. 사진 교체

`assets/img/` 안의 파일을 **같은 이름으로 덮어쓰면** 사이트에 바로 반영됩니다.
가로 사진은 1800px, 세로 사진은 1200px 정도 폭을 권장합니다.

Before & After 사진은 `assets/img/ba/README.txt` 의 파일명 규칙을 따라주세요.
