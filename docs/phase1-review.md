# NATTO MVP — ช่วงที่ 1: ข้อมูลจำลองและ Recommendation Engine

สถานะ: รอแจ็คตรวจก่อนเริ่มช่วงที่ 2 (หน้าจอ Marketing)
ข้อมูลทั้งหมดในเอกสารนี้เป็น **DEMO DATA** ที่สร้างขึ้น ไม่ใช่ข้อมูลจริงของบริษัท

## 1. เรื่องที่ต้องตัดสินก่อนไปต่อ

**Priority band ตาม spec ใช้กับคะแนนแบบบวกไม่ได้** spec ข้อ 9.2 ให้ High ≥80 และ Medium ≥60 แต่คะแนนเป็นผลรวมของ 5 สัญญาณ (30/25/20/15/10) Partner ที่มีปัญหาหนักแค่เรื่องเดียวจึงได้คะแนนไม่เกินน้ำหนักของสัญญาณนั้น เช่น Renewal ลดหนักสุดได้แค่ 30 คะแนน

ผลกับข้อมูลชุดนี้ (รอบ พ.ย. 2026, 25 คำแนะนำ):

| เกณฑ์ | High | Medium | Low |
|---|---:|---:|---:|
| ตาม spec (80 / 60) | 1 | 0 | 24 |
| ที่เสนอ (60 / 30) | 1 | 15 | 9 |

ถ้าใช้เกณฑ์ตาม spec ตัวกรอง "ปานกลาง" จะว่างทั้งหน้า และ Dealer B ที่ wireframe วางไว้เป็น "ปานกลาง" จะตกไปอยู่ "ต่ำ"

**ข้อเสนอ:** ใช้ 60 / 30 สำหรับ demo (ตั้งค่าไว้ที่ `src/engine/config.ts` จุดเดียว) และใส่ข้อนี้ในรายการที่ Business Owner ต้องอนุมัติ ถ้าแจ็คอยากคงตาม spec ก็เปลี่ยนได้ในบรรทัดเดียว

## 2. ข้อมูลจำลองที่สร้าง

| รายการ | จำนวน |
|---|---:|
| Partner หลัก (มีเรื่องเล่าตาม spec ข้อ 12) | 12 |
| Partner พื้นหลัง (สร้างจาก seed ตายตัว) | 30 |
| ข้อมูลรายเดือน (พ.ย. 2025 – ต.ค. 2026) | 42 × 12 = 504 แถว |
| แถว Vehicle Portfolio (Make / Model / ปีรถ / CC / Fuel, ต.ค. 2026) | 808 |
| ผู้ใช้ | ผู้บริหาร 1, Manager 2, Marketing 6 |
| การเข้าพบ / Feedback / งานติดตาม | 78 / 89 / 53 |
| รอบคำแนะนำ | ส.ค. – พ.ย. 2026 (4 รอบ) |

- ทีม กรุงเทพฯ (Manager: วิภาวดี) มี Marketing 3 คน คือ กิตติ, พิมพ์, อนันต์
- ทีม ภูมิภาค (Manager: ประเสริฐ) มี Marketing 3 คน คือ ศิริพร, ธนพล, วรรณา
- ผู้บริหาร: อรุณี
- ผู้ใช้ Marketing ที่ใช้ใน demo คือ **กิตติ** ซึ่งดูแล Broker A, Dealer B, Dealer C, Bank D, Broker E และ Broker H คำแนะนำรอบ พ.ย. ของกิตติยังไม่ถูกตัดสินใจ เพื่อให้กดได้สดตอน demo
- ข้อมูลล่าสุดเป็นของ ต.ค. 2026 (data as of 31 ต.ค. 2026) คำแนะนำรอบ พ.ย. ออกวันที่ 1 พ.ย. และ "วันนี้" ใน demo ตั้งไว้ที่ 20 พ.ย. 2026
- ข้อมูลชุดเดิมได้ทุกครั้งที่รัน (deterministic) และมีเทสต์ตรวจไว้แล้ว

## 3. Partner หลัก 12 ราย: ผลที่ engine ออกมา

| Partner | เรื่องตาม spec | Priority (คะแนน) | เหตุผลหลักที่ระบบให้ | โอกาส (ประมาณการ/ปี) |
|---|---|---|---|---|
| Broker A | Renewal ลด + ฐานต่ออายุสูง | **สูง (82)** | Renewal Rate 71.9% → 60.0% (−11.9 pp) ก.ค.→ต.ค. เบี้ยต่ออายุครบกำหนด 3 เดือนสูงสุดอันดับ 1 จาก 42 ราย | 5.0 ล้านบาท |
| Dealer B | Sales ลด 2 เดือนติด | ปานกลาง (35) | เบี้ยประกันลด 2 เดือนติด ต.ค. −12.6% MoM | 2.0 ล้านบาท |
| Dealer C | โอกาส EV | ปานกลาง (33) | รถ EV 27.0% ของพอร์ต (+14.6 pp ใน 6 เดือน) | ไม่ประเมิน* |
| Bank D | Product Mix กระจุก | ปานกลาง (34) | Non-Motor (PA) 1.0% เทียบค่ากลางกลุ่ม Bank 11.4% | 3.6 ล้านบาท |
| Broker E | โตแรง + cross-sell | ต่ำ (13) | โต +9.8% QoQ แต่ Non-Motor ต่ำกว่ากลุ่ม 2.2 pp | 0.7 ล้านบาท |
| Dealer F | เหมาะกับผลิตภัณฑ์ใหม่ | ต่ำ (15) | รถ EV 14.0% (+4.0 pp) จะเด่นใน Scenario Explorer | ไม่ประเมิน* |
| Bank G | ผลงานดี ไม่เร่งด่วน | ไม่ถูกแนะนำ | ไม่มีสัญญาณ ใช้แสดงว่าระบบไม่ได้แนะนำทุกราย | — |
| Broker H | Feedback ด้าน Product ค้างติดตาม | ปานกลาง (33) | งานติดตามเกินกำหนด 1 รายการ (เงื่อนไขซ่อมห้าง) | ไม่ประเมิน |
| Dealer I | Renewal ลดปานกลาง | ต่ำ (24) | Renewal −7.6 pp แต่ฐานต่ออายุเล็ก | 0.8 ล้านบาท |
| Bank J | Sales ลดทั้งไตรมาส | ปานกลาง (44) | ไตรมาสล่าสุด −10.7% | 2.7 ล้านบาท |
| Broker K | EV โต | ต่ำ (25) | รถ EV 15.0% (+7.7 pp) | ไม่ประเมิน* |
| Dealer L | ข้อมูลขาด 1 เดือน | ปานกลาง (33), **ความเชื่อมั่นต่ำ** | ไม่มีข้อมูล เม.ย. 2026 ระบบไม่นับเป็นศูนย์ | 0.8 ล้านบาท |

\* ระบบไม่แสดงมูลค่าโอกาสของ EV เพราะยังไม่มีเบี้ยเฉลี่ยต่อคันของผลิตภัณฑ์ EV ที่อนุมัติ ข้อนี้ทำตามกฎข้อ 9.4 ที่ห้ามสร้างตัวเลขเอง

ตารางเต็มของทั้ง 42 ราย รวมคะแนนแยกตามสัญญาณ ดูได้ด้วยคำสั่ง `npm run report`

## 4. กติกาการให้คะแนน (สมมติฐานสำหรับ demo ยังไม่ได้อนุมัติ)

| สัญญาณ | น้ำหนัก | วิธีคิด | เงื่อนไขที่ทำให้ "ถูกแนะนำ" |
|---|---:|---|---|
| Renewal | 30 | ส่วนที่ Renewal Rate ลดลง (เดือนล่าสุดเทียบ 3 เดือนก่อน) เต็มเมื่อลด 12 pp แล้วคูณตัวคูณขนาดพอร์ต (Top 25% = 1.0, Top 50% = 0.75, ที่เหลือ = 0.5) | ลด ≥5 pp |
| Sales | 25 | ครึ่งหนึ่งมาจากจำนวนเดือนที่ลดติดกัน (เต็มที่ 3 เดือน) อีกครึ่งมาจาก QoQ (เต็มที่ −15%) | ลดติดกัน ≥2 เดือนและรวมลด ≥5% หรือ QoQ ≤ −8% |
| Product Mix | 20 | ส่วนต่างจากค่ากลางของ Partner ประเภทเดียวกัน หรือสัดส่วนของตัวเองที่ลดลงใน 6 เดือน (เต็มที่ 12 pp) หรือโอกาส cross-sell Non-Motor เมื่อ Partner โต ≥8% QoQ | ส่วนต่าง ≥8 pp หรือเข้าเงื่อนไข cross-sell |
| EV segment | 15 | ครึ่งหนึ่งจากสัดส่วนรถ EV (เต็มที่ 20%) อีกครึ่งจากการเปลี่ยนใน 6 เดือน (เต็มที่ 10 pp) | EV ≥10% หรือเพิ่ม ≥5 pp |
| การติดต่อ/งานค้าง | 10 | ได้คะแนนตามจำนวนวันที่ไม่ได้เข้าพบ (≥90 วัน = เต็ม, 60 วัน = 70%, 30 วัน = 40%) หรือได้เต็มถ้ามีงานติดตามเกินกำหนด | มีงานติดตามเกินกำหนด (จำนวนวันที่ไม่ได้เข้าพบอย่างเดียวไม่ทำให้ถูกแนะนำ) |

**สูตรมูลค่าโอกาส (ประมาณการ คิดเป็นรายปี ทุกสูตรกดดูได้ในแอป):**
- Renewal: (Renewal Rate ฐาน − Renewal Rate ล่าสุด) × เบี้ยต่ออายุครบกำหนดเฉลี่ยต่อเดือน × 12
  ตัวอย่าง Broker A: (75.6% − 60.0%) × 2.67 ล้านบาท × 12 = 5.0 ล้านบาท
- Sales: (เบี้ยเฉลี่ยต่อเดือนของ 3 เดือนก่อนหน้า − ของ 3 เดือนล่าสุด) × 12
- Product Mix: ส่วนต่างจากค่ากลางของกลุ่ม (pp) × เบี้ยเฉลี่ยต่อเดือน × 12
- EV และงานติดตาม: ไม่ประเมินมูลค่า

## 5. สมมติฐานที่ผมตั้งเอง (แจ็คค้านได้)

1. **หมวดผลิตภัณฑ์มี 5 หมวด** คือ ประเภท 1, ประเภท 2+/3+, ประเภท 3, พ.ร.บ. และ Non-Motor (PA) ใส่ Non-Motor ไว้เพื่อรองรับ scenario "เพิ่มยอดขาย Non-Motor" ใน board หน้า 3
2. **Renewal Rate นับตามจำนวนกรมธรรม์** และ Vehicle Mix นับตามจำนวนคัน (spec ข้อ 8.2 ยังรอยืนยัน)
3. **กลุ่มเปรียบเทียบคือ Partner ประเภทเดียวกัน** (Broker / Dealer / Bank) ตามคำถามเปิดข้อ 6
4. **ไม่ใช้ตัวเลขจาก board** ตัวเลขทุกตัวในแอปคำนวณจาก dataset เช่น board เขียนว่า Broker A ลด 18 pp แต่ dataset ได้ −11.9 pp
5. **คำอธิบายจาก "AI" ใช้ template ที่เติมตัวเลขจาก engine** ไม่เรียก LLM จริง demo จึงนิ่งและไม่มีตัวเลขที่แต่งขึ้น ภายหลังเปลี่ยนเป็น LLM ได้โดยส่ง facts ชุดเดียวกันเข้าไป (แจ็คยังไม่ได้ตอบข้อนี้ ผมจึงใช้ตามที่เสนอไว้)
6. **ใช้ปี ค.ศ.** (พ.ย. 2026) ตาม board
7. **หน้าบันทึก 7P ทำตาม board หน้า 5** ให้ประเมินแต่ละ P เป็น ดี / ปกติ / ต้องปรับ ซึ่งตรงกับ Sentiment Positive / Neutral / Negative ใน spec ถ้าเลือก "ต้องปรับ" จะต้องระบุ Severity ด้วย
8. **ไม่ทำ "เอกสาร" (tab ใน board หน้า 6) และ "ผู้เข้าร่วม UW/Product"** ใน MVP เพราะ spec ไม่ได้กำหนด ใน wireframe จะแสดงเป็นช่องข้อความแทน

## 6. รูปที่ต้องสร้างเพิ่ม

mascot ท่าหลักใช้ไฟล์ที่แจ็คแนบมาได้ทันที (พื้นหลังโปร่งใสแล้ว อยู่ที่ `public/assets/mascot-natto.webp`) รูปที่ยังขาดคือท่าสำหรับ state ต่างๆ ซึ่ง spec บังคับให้ทุกหน้ามี:

| # | ไฟล์ | ใช้ที่ | ความจำเป็น |
|---|---|---|---|
| 1 | `mascot-thinking.png` | ตอนโหลด / AI กำลังวิเคราะห์ | ต้องมี |
| 2 | `mascot-empty.png` | หน้าว่าง เช่น ไม่มีคำแนะนำหรือไม่มีประวัติ | ต้องมี |
| 3 | `mascot-error.png` | ข้อมูลโหลดไม่ได้ / error | ต้องมี |
| 4 | `mascot-success.png` | บันทึกการเข้าพบสำเร็จ | ควรมี |
| 5 | `mascot-present.png` | ปกและสไลด์ปิดของ presentation | ควรมี |

ถ้ายังไม่มีรูป ผมจะใช้ท่าหลักแทนไปก่อน แอปจึงไม่ติดเรื่องนี้

**ส่วนที่ใช้ร่วมกันทุก prompt** (ใส่ไว้หน้า prompt ของแต่ละท่า เพื่อให้หน้าตาตัวละครเหมือนเดิม):

```
3D cute mascot character for a Thai insurance app called "NATTO". A glossy golden-yellow natto soybean blob with a round happy face, closed curved eyes, rosy pink cheeks, wearing a red-and-white twisted Japanese hachimaki headband tied with a bow on the right. It sits inside a blue ceramic rice bowl with a white seigaiha wave pattern, surrounded by small glossy golden soybeans. Soft studio lighting, clean Pixar-style 3D render, smooth plastic-like material, high detail. Same character design as the reference image. Isolated on a fully transparent background, no text, no shadow on background, centered, square 1:1, 2048x2048.
```

**prompt ของแต่ละท่า** (ต่อท้ายส่วนที่ใช้ร่วมกัน):

1. thinking: `Pose: the mascot looks up thoughtfully with one eye open, holding a small blue magnifying glass with a chopstick-like arm, three small golden sparkle dots above its head suggesting analysis. Calm, focused expression.`
2. empty: `Pose: the bowl is almost empty with only two or three soybeans; the mascot rests its chin on the bowl rim with a relaxed, slightly sleepy smile, a small "zzz" shape made of soybean dots (no letters). Gentle, friendly mood.`
3. error: `Pose: the mascot looks surprised and slightly worried, eyes open as small dots, a single blue sweat drop on its forehead, the headband slightly tilted, sticky natto strings tangled around the chopsticks. Still cute, not scary.`
4. success: `Pose: the mascot celebrates with a big open-mouth smile, raising the chopsticks like a victory sign, small golden confetti and stars bursting around the bowl. Joyful, energetic.`
5. present: `Pose: the mascot leans forward from the bowl and gestures to the right with the chopsticks as if presenting a chart, confident friendly smile, a few small soybeans floating. Leave empty space on the right side.`

ถ้าเครื่องมือรองรับรูปอ้างอิง ให้แนบไฟล์ mascot ต้นฉบับไปด้วยทุกครั้ง หน้าตาตัวละครจะออกมาตรงกันกว่าใช้ข้อความอย่างเดียว

## 7. ทดสอบอะไรไปแล้ว

**ทดสอบแล้ว** (`npm test`: 16 เทสต์ผ่าน, `tsc` ผ่าน)
- ข้อมูลออกมาเหมือนกันทุกครั้งที่รัน
- มี Partner หลัก 12 ราย Partner พื้นหลัง 30 ราย และข้อมูลรายเดือนครบ 12 เดือน
- เดือนที่ขาดเป็น null ไม่ถูกนับเป็นศูนย์
- เหตุผลหลักของ Partner หลักทุกรายตรงตามเรื่องใน spec
- ตัวเลขหลักฐานในคำแนะนำตรงกับข้อมูลรายเดือน
- มูลค่าโอกาสทุกตัวคำนวณย้อนจากค่าที่แสดงได้
- ทุกคำแนะนำมีอย่างน้อย 1 สัญญาณ
- คำแนะนำรอบปัจจุบันของผู้ใช้ demo ยังไม่ถูกตัดสินใจ

**ยังไม่ได้ทดสอบ**
- หน้าจอทั้งหมด (เริ่มในช่วงที่ 2)
- Scenario Explorer: engine ยังไม่มีส่วน scenario จะทำพร้อมหน้าจอ M03
- การเข้าพบเดือน พ.ย. มีแค่ 8 ครั้ง (ถึงวันที่ 20 พ.ย.) Manager dashboard รายเดือนอาจดูบาง ถ้าเห็นหน้าจอแล้วยังบางเกินไป ผมจะเพิ่มข้อมูลจำลองของ พ.ย.

## 8. จุดที่ผู้เชี่ยวชาญควรยืนยันก่อนใช้กับข้อมูลจริง

- นิยาม Renewal Rate (ตัวตั้ง ตัวหาร และ cohort) และ Renewal Premium: Data Owner
- น้ำหนัก เกณฑ์ trigger และ priority band: Business Owner
- สูตรมูลค่าโอกาส โดยเฉพาะข้อสมมติว่าเบี้ย Product Mix ที่เพิ่มขึ้นเป็นยอดใหม่ ไม่ได้ย้ายมาจากหมวดอื่น: Business Owner / Actuarial
- ฐานของ Vehicle Mix (นับคัน หรือถ่วงตามเบี้ย): Data Owner
- กลุ่มเปรียบเทียบ (peer group) ของ Product Mix: Business Owner
