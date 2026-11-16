---
name: "FUNCH — Easy Days · Original"
description: "Selected on 2026-11-16. White canvas, blue actions, light-blue surfaces, Manrope, and the Easy Days customer/admin composition."
colors:
  canvas: "#ffffff"
  primary: "#2747b7"
  primary-hover: "#1c358d"
  accent: "#dfe9fc"
  surface-soft: "#f0f5ff"
  text: "#25314c"
  text-muted: "#57657e"
  border: "#e0e6f1"
  summary-divider: "#d7e2f5"
  placeholder: "#64736d"
  pending-text: "#815110"
  pending-surface: "#fff0ce"
  approved-text: "#17604a"
  approved-surface: "#e3f3eb"
  in-use-text: "#28569c"
  in-use-surface: "#e9f0fc"
  completed-text: "#56615e"
  completed-surface: "#edf0ef"
  rejected-text: "#a22f2f"
  rejected-surface: "#fce8e8"
  danger-hover: "#842323"
  form-error: "#a32d25"
  success: "#16a34a"
  success-hover: "#15803d"
  warning: "#f59e0b"
  warning-hover: "#d97706"
typography:
  display:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "43px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  display-mobile:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "35px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "27px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "21px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  button:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "10px"
    fontWeight: 650
    lineHeight: 1.55
  table:
    fontFamily: "FunchManrope, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  badge: "5px"
  secondary: "8px"
  input: "10px"
  primary: "10px"
  vehicle-image: "18px"
  admin-panel: "18px"
  hero-image: "20px"
  filter: "22px"
  account: "30px"
spacing:
  compact: "8px"
  field-gap: "15px"
  image-card-gap: "21px"
  medium: "24px"
  workspace-gap: "30px"
  workspace-padding: "32px"
  desktop-gutter: "34px"
  hero-gap: "42px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    rounded: "{rounded.primary}"
    padding: "12px 21px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.canvas}"
  button-car:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.primary}"
    typography: "{typography.button}"
    rounded: "{rounded.secondary}"
    padding: "8px 13px"
  field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    rounded: "{rounded.input}"
    padding: "9px 13px"
  booking-detail:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.admin-panel}"
    padding: "20px"
---

# FUNCH — Easy Days · Original

## Overview

**สถานะ: ผู้ใช้เลือกแล้วเมื่อ 16 พฤศจิกายน 2026** ใช้ Easy Days · Original เป็นทิศทางหลักสำหรับงาน frontend ต่อจากนี้ การเลือกดีไซน์ยังไม่ใช่คำสั่งให้เปลี่ยน production ทุกหน้าในรอบเอกสารนี้

เอกสารนี้แทนคู่มือเปรียบเทียบสี่แบบเดิม เป็นแหล่งอ้างอิงดีไซน์หลักสำหรับ Luna และผู้พัฒนาคนอื่น อ่านรายละเอียดเฉพาะหน้าที่กำลังทำร่วมกับข้อกำหนดสี ฟอนต์ และ components ที่ใช้ร่วมกัน

### อะไรทำให้เป็น Easy Days

พื้นขาวเป็นพื้นที่หลัก ปุ่มและสิ่งที่เลือกใช้น้ำเงินเข้ม พื้นฟ้าอ่อนช่วยจัดกลุ่มข้อมูล ภาพการเดินทางอยู่ข้างฟอร์มค้นหาบน desktop และย้ายลงใต้ฟอร์มบน mobile รายการรถเป็นการ์ดแบบเปิด: รูปรถมุมโค้งอยู่ด้านบน ข้อความและราคาอยู่บนพื้นขาวโดยไม่มีกรอบล้อมทั้งใบ

บุคลิกเป็นมิตร โปร่ง และอ่านง่าย ลูกค้าเริ่มจากสถานที่กับช่วงเวลาได้ทันที ส่วนแอดมินเริ่มจากคิวงานและสถานะ ใช้ภาษาภาพเดียวกัน แต่มีความหนาแน่นเหมาะกับงาน

### ลำดับอ้างอิง

1. คำสั่งล่าสุดของผู้ใช้กำหนดการเปลี่ยนแปลงที่อนุญาต
2. เอกสารนี้กำหนดธีมที่เลือกแล้ว และการตัดสินใจใช้ **shadcn/ui + Tailwind CSS**
3. [ภาพอ้างอิง](#ภาพอ้างอิงที่ตรึงไว้) ใน `docs/design/easy-days-original/` และค่าที่ render จริงช่วยตัดสินสัดส่วนและรายละเอียด
4. Token ตัวแปร CSS ที่ตั้งไว้ใน `app/globals.css` เป็น baseline สำหรับ Tailwind CSS และ shadcn/ui
5. [PRODUCT.md](PRODUCT.md), [คำศัพท์ธุรกิจ](../CONTEXT.md) และ [บริบทธุรกิจ](../docs/project-context.md) กำหนดความหมายและ workflow

หากใช้ ui-ux-pro-max หรือ Impeccable ให้ใช้ตรวจคุณภาพภายในธีมนี้ สีและ composition ผ่านการเลือกแล้ว จึงไม่ต้องเริ่มค้นหา art direction ใหม่ Hertz และ Europcar เป็นที่มาของแนวคิดการค้นหาและการนำเสนอรถ ส่วนภาพ Easy Days ที่เลือกเป็นหลักสำหรับหน้าตาปัจจุบัน

### ภาพอ้างอิงที่ตรึงไว้

| ภาพ | Viewport ตอนจับภาพ | ใช้ดู |
| --- | --- | --- |
| [Desktop — first screen](docs/design/easy-days-original/desktop-first-screen.png) | 1440 × 1000 | ลำดับฟอร์มกับภาพ สัดส่วน hero และจุดเริ่มรายการรถ |
| [Desktop — full page](docs/design/easy-days-original/desktop.png) | กว้าง 1440; ความสูงตามเนื้อหา | การ์ด ราคา สาขา และ footer |
| [Mobile — full page](docs/design/easy-days-original/mobile.png) | กว้าง 390; viewport สูง 844 | ลำดับแบบคอลัมน์เดียว การย้ายภาพ และขนาดการ์ด |
| [Admin — full page](docs/design/easy-days-original/admin.png) | กว้าง 1440; viewport สูง 1000 | sidebar, filters, queue และรายละเอียดด้านข้าง |

ภาพอ้างอิงจับภาพจาก Easy Days · Original โดยรอ font และภาพโหลดครบ ใช้ dark OS preference เพื่อยืนยันว่า body ยังขาว ข้อมูลในภาพเป็นตัวอย่าง ไม่ใช่ requirement เรื่องชื่อสมาชิก รุ่นรถ สาขา ราคา หรือจำนวนที่ว่าง โค้ดต้นแบบเปรียบเทียบชั่วคราวถูก clean up ออกแล้วก่อน commit เพื่อให้ repo มีเฉพาะ specification และ token ที่ใช้งานจริง

### สิ่งที่คงไว้และสิ่งที่ปรับได้

| คงไว้ | ปรับตามงานได้ |
| --- | --- |
| body ขาว รวม dark OS preference | เนื้อหาและข้อมูลจริงจาก API |
| Palette น้ำเงิน–ฟ้าอ่อนตาม token | จำนวนรายการและความยาวชื่อจริง |
| Manrope และลำดับความสำคัญของตัวอักษร | การตัดบรรทัดเพื่อรองรับภาษาและข้อมูล |
| ปุ่มหลักน้ำเงิน ตัวอักษรขาว | จำนวน field ตาม requirement ของหน้านั้น |
| พื้นฟ้าอ่อนสำหรับกลุ่มข้อมูลที่มีหน้าที่ชัด | การใช้ตาราง ฟอร์ม หรือรายละเอียดตามงาน |
| การ์ดรถแบบเปิดและภาพมุมโค้ง | อัตราส่วนคอลัมน์ในหน้าใหม่เมื่อมีเหตุผลด้านงาน |
| Native controls, visible labels และ focus | การขยายพื้นที่สัมผัสหรือข้อความเพื่อ accessibility |

ขยายหน้าใหม่จากระบบ components นี้ พร้อมระบุการปรับที่จำเป็น ไม่สร้าง palette ฟอนต์ หรือรูปลักษณ์ใหม่ในแต่ละหน้า

## Colors

### สีหลักและหน้าที่

| Token | ค่า | หน้าที่ |
| --- | --- | --- |
| `canvas` | `#FFFFFF` | HTML body, พื้นหลัก, ฟอร์ม, sidebar และตาราง |
| `primary` | `#2747B7` | Primary CTA, active navigation, selected filter, ลิงก์สำคัญ และ focus |
| `primary-hover` | `#1C358D` | Hover ของ primary CTA |
| `accent` | `#DFE9FC` | Avatar, selected supporting surface และกลุ่มรองที่ต้องแยกจากพื้นหลัก |
| `surface-soft` | `#F0F5FF` | ปุ่ม View car แบบปกติ, summary strip, detail panel, selected row, feedback |
| `text` | `#25314C` | Heading, รุ่นรถ, ราคา และข้อมูลหลัก |
| `text-muted` | `#57657E` | คำอธิบาย label รอง สเปก และหมายเหตุ |
| `border` | `#E0E6F1` | Field, divider, table row และเส้นแบ่ง navigation |
| `summary-divider` | `#D7E2F5` | เส้นแบ่ง summary ของหน้า admin |
| `placeholder` | `#64736D` | Placeholder ที่มีอยู่ในต้นแบบ |

สีขาวต้องเป็น background ของ `html` และ `body` จริง ไม่ใช่เพียง container ขาวคลุม body สีอื่น ตั้ง browser controls เป็น `color-scheme: light` สำหรับธีมนี้ พื้น `surface-soft` ใช้เป็น section หรือ panel ที่มีขอบเขตชัดเจน

ใช้ token ตามหน้าที่ ตัวอักษรเนื้อหาใช้ `text` หรือ `text-muted` ส่วน primary ใช้กับการกระทำ สิ่งที่เลือก และทางนำสายตา ภาพรถเป็นแหล่งสีเพิ่มเติมตามธรรมชาติของภาพ ไม่ต้องย้อมภาพด้วยสีแบรนด์

### สีสถานะและ Semantic Action Buttons

| สถานะ / Action | ตัวอักษร | พื้น | ความหมายและข้อความตัวอย่าง |
| --- | --- | --- | --- |
| `PENDING` (Badge) | `#815110` | `#FFF0CE` | Awaiting review / Pending approval |
| `APPROVED` (Badge) | `#17604A` | `#E3F3EB` | Awaiting pickup; อนุมัติแล้ว ยังไม่ assign รถ |
| `IN_USE` (Badge) | `#28569C` | `#E9F0FC` | On the road |
| `COMPLETED` (Badge) | `#56615E` | `#EDF0EF` | Completed |
| `REJECTED` (Badge) | `#A22F2F` | `#FCE8E8` | Rejected พร้อมเหตุผล |
| Success Action Button (`variant="success"`) | ขาว | `#16A34A` | อนุมัติ ส่งมอบรถ (Assign & Pickup, Approve); hover `#15803D` |
| Warning Action Button (`variant="warning"`) | `#25314C` | `#F59E0B` | บันทึกรับรถคืน จัดการค่าปรับ (Process Return, Settle); hover `#D97706` |
| Destructive Action Button (`variant="destructive"`) | ขาว | `#A22F2F` | ปฏิเสธ/การกระทำที่มีผลลบ (Reject, Cancel); hover `#842323` |
| Field error | `#A32D25` | พื้นขาวของฟอร์ม | ปัญหาของ field และวิธีแก้ |

ทุกสถานะมีข้อความกำกับ สีสถานะแยกจากสีแบรนด์ การอนุมัติไม่ใช้ข้อความที่รับรองว่ารถจริงพร้อมส่งมอบแล้ว

### การนำ token ไปใช้กับ shadcn/ui และ Tailwind CSS

การสร้าง UI ตัดสินใจใช้ **shadcn/ui + Tailwind CSS** เป็นมาตรฐานหลัก Token สีและขนาดทั้งหมดของ Easy Days · Original ได้ถูก map เข้ากับ CSS variables ใน `app/globals.css` และ `@theme inline` ของ Tailwind CSS ดังนี้:

```css
/* app/globals.css */
:root {
  --background: #ffffff;
  --foreground: #25314c;
  --card: #ffffff;
  --card-foreground: #25314c;
  --popover: #ffffff;
  --popover-foreground: #25314c;
  --primary: #2747b7;
  --primary-foreground: #ffffff;
  --primary-hover: #1c358d;
  --secondary: #f0f5ff;
  --secondary-foreground: #2747b7;
  --muted: #f0f5ff;
  --muted-foreground: #57657e;
  --accent: #dfe9fc;
  --accent-foreground: #25314c;
  --destructive: #a22f2f;
  --destructive-foreground: #ffffff;
  --border: #e0e6f1;
  --input: #e0e6f1;
  --ring: #2747b7;
  --radius: 0.625rem; /* 10px */
}
```

เมื่อใช้ shadcn/ui components (เช่น `<Button>`, `<Card>`, `<Input>`, `<Table>`, `<Badge>`):
- Primary Action ใช้ `variant="default"` ซึ่งจะดึง `--primary` (#2747B7) และ hover `--primary-hover` (#1C358D) โดยอัตโนมัติ
- Card สำหรับรายการรถใช้ `<Card>` พื้นขาว Border `--border` (#E0E6F1) พร้อม rounded corners
- Sub-surfaces และ panel สรุปข้อมูล ใช้ background `--secondary` / `--muted` (#F0F5FF)
- Form inputs ใช้ `<Input>` ที่มี border `--input` (#E0E6F1) และ focus ring `--ring` (#2747B7)

## Typography

### Font และน้ำเสียง

ใช้ Manrope แบบ variable 200–800 ที่ `public/design-v2/manrope.ttf` ชื่อ CSS `FunchManrope` ใช้ `font-display: swap` และเก็บ `OFL-Manrope.txt` เมื่อย้าย asset ทุกหน้าคง Latin typeface เดียวกัน รวม heading, button, form และตาราง

พื้นที่ UI ที่เห็นในต้นแบบเริ่มที่ `14px / 1.55 / 400` ภายใน root แม้ global body ของแอปเดิมอาจใช้ค่าอื่น ให้ยึดพื้นที่ UI ที่เลือกเป็นหลัก ภาษาไทยในต้นแบบ fallback ไปยัง platform sans-serif; ยังไม่มีการเลือก Thai webfont ใหม่ หากต้องรองรับข้อความไทยจริง ให้รักษา Manrope สำหรับ Latin และตรวจ fallback เรื่องความสูงบรรทัดกับการตัดคำ

น้ำเสียงข้อความเป็นมิตรและบอกงานตรง ๆ เช่น “Find a car”, “View car”, “Awaiting review” Heading หน้า admin บอกพื้นที่ทำงาน ไม่ยกคำโฆษณาจากหน้าแรกมาแทนชื่อหน้า

### ค่าจากหน้าที่ render จริง

ค่าปุ่มในตารางนี้เป็น computed style ของแบบที่เลือก CSS เดิมมี `font: inherit` ที่ specificity สูงกว่า declaration บางตัว ดังนั้นข้อความปุ่มหลักและ View car ที่เห็นจริงคือ **14px / 400** ไม่ใช่ 13px / 750 ที่อ่านจาก `.primaryButton` เพียง selector เดียว

| บทบาท | Desktop | Mobile 390px | Weight / line-height |
| --- | --- | --- | --- |
| Customer h1 | 43px | 35px | 750 / 1.2; tracking `-.035em` |
| Hero supporting copy | 13px | 13px | 400 / 1.55 desktop, 1.75 mobile |
| Fleet h2 | 27px | 25px | 750 / 1.2; tracking `-.025em` |
| รุ่นรถ | 21px | 23px | 750 / 1.2; tracking `-.025em` |
| ข้อความใต้รุ่นรถ | 11px | 12px | 400 / 1.55 |
| สเปกรถ | 10px | 11px | 400 / 1.55 |
| ราคาหลัก | 19px | 21px | 750 / 1.55; tracking `-.035em` |
| Primary / View car button | 14px | 14px | 400 / 1.55 |
| Category filter | 12px | 11px | 650 / 1.55 |
| Field label | 10px | 10px | 650 / 1.55 |
| Datetime value | 12px | 10px | 700 / 1.55 |
| Header wordmark `funch.` | 35px | 32px | 800 / 1; tracking `-.04em` |
| Admin h1 | 29px | ใช้ responsive ตาม scope | 750 / 1.2 |
| Admin queue h2 | 18px | ตาม scope | 750 / 1.2 |
| Admin table header | 11px | ตาม scope | 600 / 1.55 |
| Admin table cell | 12px | ตาม scope | 400 / 1.55 |
| Admin detail h2 | 19px | ตาม scope | 750 / 1.2 |
| Admin fact label / value | 11px / 12px | ตาม scope | 400 / 650 |
| Admin status badge | 11px | ตาม scope | 650 / 1.4 |
| Admin summary count | 25px | ตาม scope | 750 / 1.2; tabular numerals |

ใช้ `text-wrap: balance` กับ heading, line-height ที่เพียงพอ และให้ข้อความยาวขึ้นได้ ราคาและข้อมูลจำนวนในหลังบ้านใช้ `font-variant-numeric: tabular-nums` ตามบทบาท

ข้อความ 9–11px ในต้นแบบเป็นข้อจำกัดที่ต้องตรวจตอนทำ production ไม่ใช่เกณฑ์ accessibility ที่อนุมัติแล้ว หากข้อมูลจริง ภาษาไทย browser zoom หรือ native mobile input ต้องการขนาดใหญ่ขึ้น ให้ปรับเฉพาะส่วนที่จำเป็น คงลำดับความสำคัญและบันทึกเหตุผลไว้ในผลส่งงาน

## Layout

### Customer desktop: 1440px reference

```text
Header: funch.        Find a car / Our branches / My bookings        My account
────────────────────────────────────────────────────────────────────────────
Heading + supporting copy       │ Airport photograph
Country       Branch            │
Pickup        Return            │
[          Find a car         ] │
Same branch / local timezone    │

Find your kind of car.                                      Sort by
Branch context and result count
[All cars] [Sedan] [SUV]

Photo            Photo            Photo
Model            Model            Model
Specs            Specs            Specs
Rate / total     Rate / total     Rate / total
     View car         View car         View car

Branches / footer
```

- Customer content: `max-width: 1212px`, centered, `width: min(1212px, 100% - 68px)`; ที่ viewport 1440 ขอบเนื้อหาอยู่ประมาณ x=114 และ x=1326
- Navigation: max-width 1280px, padding ซ้าย/ขวา 34px, minimum height 92px
- Hero: grid `1.06fr .94fr`, gap 42px, padding บน 28px ล่าง 15px
- ที่ reference 1440 คอลัมน์ฟอร์มกว้างประมาณ 620px และภาพประมาณ 550px
- Hero heading max-width 440px เพื่อให้เกิดการตัดบรรทัดแบบในภาพ
- Form อยู่หลัง supporting copy 24px; grid สองคอลัมน์เท่ากัน gap 15px
- แถวแรก Country / Branch; แถวสอง Pickup / Return; แถวสามปุ่มค้นหาเต็มความกว้าง
- ไม่มีกล่องสีล้อม hero และฟอร์มทั้งก้อนใน Easy Days ช่องกรอกแต่ละช่องมี border ของตนเอง
- ภาพ hero สูงขั้นต่ำ 420px, radius 20px, `object-fit: cover`, object-position ประมาณ 62% center
- Caption ภาพเป็นพื้นขาวขนาดพอดีข้อความ อยู่ซ้าย/ล่าง 20px, padding 10px 13px, radius 8px
- Fleet มี top padding 40px; heading กับ sort อยู่คนละฝั่ง, context อยู่ใต้ heading
- Category filters เว้นด้านบน 24px ด้านล่าง 22px
- Vehicle grid สามคอลัมน์เท่ากัน gap 21px

เนื้อหารับผิดชอบการแนะนำการเดินทางเพียงสั้น ๆ แล้วให้ฟอร์มทำหน้าที่หลัก หน้าจออื่นไม่จำเป็นต้องมี hero นี้ เช่นหน้า account หรือหน้า admin เริ่มจากงานของหน้านั้นได้

### Customer responsive

| ช่วงกว้าง | การจัดองค์ประกอบ |
| --- | --- |
| มากกว่า 1150px | Hero สองคอลัมน์, form 2×2, รถสามคอลัมน์; geometry ตาม desktop reference |
| 801–1150px | Content gutter 28px; hero gap 25px, h1 38px; form gap 10px; รถยังสามคอลัมน์ gap 14px; ราคา/ปุ่มในการ์ดแยกคนละบรรทัด |
| 501–800px | Content gutter 20px; nav เป็น menu toggle; hero เป็นหนึ่งคอลัมน์ ฟอร์มก่อนภาพ; Country และ Branch เต็มแถว, วันที่สองช่องคู่กัน, ปุ่มเต็มแถว; ภาพสูง 210px; รถสองคอลัมน์ gap 18px |
| ไม่เกิน 500px | Content gutter 16px; header min-height 76px; h1 35px; ภาพ hero สูง 165px; รถหนึ่งคอลัมน์ gap 20px, ภาพรถสูง 200px; sort ย้ายใต้หัวข้อ; ราคาและ View car อยู่ข้างกันตามพื้นที่ |

ที่ 390px ฟอร์มกว้างประมาณ 358px ส่วนภาพอยู่หลังฟอร์มก่อนหัวข้อรายการรถ Header คง wordmark กับ My account และมีปุ่มเมนู ตรวจไม่ให้ native datetime ทำให้ document เลื่อนแนวนอน

### Admin desktop: 1440px reference

```text
White sidebar │ Workspace / Bookings                         Country / branch context
              │ Bookings                         Current operational date/context
Bookings      │ [Awaiting review | Pickup preparation | On the road]
Fleet         │
Options       │ Booking queue                         │ Selected booking
Members       │ Search + branch filter                │ Status / ID / customer
Reports       │ Status tabs                           │ Vehicle / branch / times
              │ Table: customer, vehicle, period,     │ Options / value
Staff profile │        value, status, open details    │ Review / next action
```

- Sidebar กว้าง 185px, พื้นขาว มีเส้นแบ่งด้านขวา; item ที่เลือกพื้น primary และข้อความขาว
- Topbar สูงขั้นต่ำ 75px, padding 15px 32px, divider ด้านล่าง
- Main content padding 30px 32px
- Summary strip พื้น soft, radius 18px, padding รอบกลุ่ม 7px; แต่ละส่วนกดกรองสถานะได้
- Work area: `minmax(0, 1fr) 295px`, gap 30px; ฝั่งซ้ายคิว ฝั่งขวารายละเอียด
- Booking detail พื้น soft, radius 18px, padding 20px
- Table อยู่บนพื้นขาว มีเส้นแบ่งแนวนอน, selected row พื้น soft, cell padding แนวตั้ง 22px สำหรับ Easy Days
- ที่ 1150px ลงมา sidebar 160px และ detail 265px; ซ่อน column บางส่วนจากตารางเมื่อยังเข้าถึงข้อมูลนั้นได้ใน detail
- ที่ 800px ลงมา sidebar ถูกซ่อน คิวกับรายละเอียดเรียงลงมา และ table scroll ใน container
- ที่มากกว่า/เท่ากับ 1550px detail ขยายเป็น 330px ตาม rule ที่มีอยู่

ต้นแบบ admin ที่เลือกตรวจหลักบน desktop ยังไม่มีระบบ navigation admin บนโทรศัพท์ครบทุกหน้า หากงานถัดไปต้องรองรับ staff mobile ให้เพิ่ม navigation ที่เข้าถึงได้ตาม requirement โดยใช้ components และ palette นี้ ไม่อ้างว่าภาพ desktop อนุมัติ mobile flow ทั้งหมดแล้ว

### การนำไปใช้กับหน้าที่ไม่มีภาพตัวอย่าง

ส่วนนี้เป็นแนวทางขยายธีม ไม่ใช่ layout ใหม่ที่มีภาพอนุมัติแล้ว:

| หน้า | ใช้รูปแบบร่วมใด |
| --- | --- |
| Offer detail | ภาพจริง + ชื่อรุ่น/สเปก + ฟอร์มช่วงเวลา/options + quote summary; ใช้ spacing, inputs, primary CTA และ soft summary เดิม |
| Checkout | กลุ่มข้อมูลผู้เช่าบนพื้นขาวและ summary พื้น soft; ระบุการส่งคำขอรออนุมัติ ใช้ข้อความ CTA ตามขั้นตอนจริง |
| My bookings | รายการที่อ่านสถานะ วันเวลา สาขา และยอดได้เร็ว; ใช้ badges และ detail facts แบบเดียวกับ admin |
| Account / authentication | หน้าฟอร์มกระชับ labels ชัด input/ปุ่มเดิม; อ่าน role และสถานะจากระบบจริง |
| Fleet / options / members | Admin shell เดิม + filter/table + form หรือ detail ที่ใช้ input ชุดเดียวกัน |
| Reports | Admin shell เดิม; ตารางและกราฟรองรับการเปรียบเทียบข้อมูล ใช้สีสถานะเมื่อมีความหมาย และแยกสกุลเงิน |

เลือกจำนวนคอลัมน์จากงานและความยาวข้อมูล ไม่ยก hero หรือการ์ดรถไปครอบทุกหน้าจนงานใช้งานยากขึ้น

## Elevation & Depth

ให้ความลึกผ่านพื้นขาว พื้น soft เส้นแบ่งบาง และระยะห่าง ภาพรถกับ type hierarchy เป็นองค์ประกอบนำสายตา

- Easy Days search form: border/shadow ของ container เป็นศูนย์; แต่ละ field มี border 1px
- Vehicle card: ไม่มี shadow และกรอบครอบทั้งใบ
- Admin summary และ detail ใช้พื้น soft แทนการยกด้วยเงา
- Mobile menu เปิดแล้วใช้ `0 8px 14px rgb(25 40 35 / 6%)`
- ไม่ใช้ shadow ของ `.searchFields` แบบ base ที่ถูก Easy Days override ออกแล้ว
- Color/border transitions: 180ms ease-out; ไม่มี page-load choreography หรือการซ่อนเนื้อหาเพื่อรอ animation
- `prefers-reduced-motion: reduce` ปิด animation/transition และใช้ automatic scrolling

รักษาความนิ่งของตารางและฟอร์ม การตอบสนองควรบอก hover, selection, busy หรือผลของ action โดยไม่เปลี่ยนขนาด layout

## Shapes

| องค์ประกอบ | รูปทรงอ้างอิง |
| --- | --- |
| Hero image | radius 20px |
| Vehicle image | radius 18px |
| Vehicle card รอบนอก | border 0, radius 0, พื้นขาว |
| Field desktop | radius 10px, border 1px |
| Primary button | radius 10px |
| View car / secondary button | radius 8px |
| Filter chip | radius 22px |
| Status badge | radius 5px |
| Admin summary / detail | radius 18px |
| Account action | radius 30px, เส้นขอบบาง |
| Avatar | วงกลม |

รูปทรงแต่ละบทบาทใช้ซ้ำอย่างสม่ำเสมอ มุมโค้งช่วยให้เป็นมิตร แต่ heading, section และ table ไม่ต้องถูกใส่กล่องตามไปด้วย

## Components

### Header, wordmark และ footer

Header ใช้ `funch.` เป็น wordmark ตัวอักษรน้ำเงิน ตัวหนา 800 ไม่มีสัญลักษณ์ประกอบที่สร้างเพิ่ม Navigation เรียบและมี active state ที่อ่านได้ Account action มี outline บางและไอคอนคน

Footer ใช้ wordmark ที่ขนาด 29px พร้อม muted supporting copy และเส้นแบ่งด้านบน ต้นแบบ footer wordmark เป็นสี muted ตาม cascade ภายใน footer ส่วน header ใช้ primary รักษาบทบาทนี้เมื่อเทียบภาพ

Mobile menu เป็น navigation ที่เปิดใต้ header บนพื้นขาว ปุ่มมีชื่อสำหรับ screen reader และ `aria-expanded` ทุกลิงก์เข้าถึงด้วย keyboard ได้

### Search fields

- ใช้ native select และ date/time control ที่สัมพันธ์กับข้อมูลจริง
- Label อยู่เหนือค่าเสมอ มี icon ขนาดประมาณ 16px ที่ label ตามต้นแบบ
- Field desktop padding 9px 13px และ min-height 70px; ปล่อยความสูงโตตาม font และ native control
- สี label เป็น muted; ค่าเป็น text, weight 700
- Input/select ภายในไม่มีกรอบซ้ำอีกชั้น ใช้กรอบของ field
- กำหนด country ก่อน branch และเปลี่ยน branch choices ตาม country
- แสดงรับ–คืนสาขาเดียวกันและ timezone ของสาขาใกล้ฟอร์ม
- Validate return หลัง pickup; เชื่อมข้อความ error กับ field และคงค่าที่ผู้ใช้กรอก
- เมื่อแก้สาขาหรือวันเวลา ให้ล้าง confirmation ของคำขอเดิมและแสดงผล quote ที่สัมพันธ์กับข้อมูลล่าสุด

### Primary action

พื้น primary ตัวอักษรขาว radius 10px, min-height 48px, padding 12px 21px ใช้ search icon ด้านซ้ายในปุ่มค้นหา ปุ่มของ form กว้างเต็มพื้นที่ form

ปกติ → hover primary-hover → busy/disabled มีข้อความอธิบายและกดซ้ำไม่ได้ ต้นแบบ disabled ใช้ opacity .48 ซึ่งเป็นค่าที่สังเกตได้ ไม่ใช้ opacity นี้แทน semantic `disabled`

Focus outline เป็น primary หนา 3px offset 4px; staff search wrapper ใช้ outline 2px offset 2px พื้นที่รอบ control ต้องไม่ตัด outline

### Vehicle categories

Filter เป็น pill มี car icon กับชื่อ category ใช้ `aria-pressed` Selected พื้น primary/ข้อความขาว; ปกติพื้นขาว border; hover พื้น soft สูงอย่างน้อย 40px desktop และ 44px ที่ขนาดโทรศัพท์

### Vehicle card: รายละเอียดที่ต้องรักษา

1. รูป 185px บน desktop, radius 18px, cover; category badge ขาววางซ้ายบน
2. ชื่อรุ่นอยู่ใต้ภาพ แล้วตามด้วยข้อความสั้นที่อธิบายการใช้งาน
3. สเปกเรียงอย่างสม่ำเสมอ เช่น seats / transmission / fuel type
4. Divider คั่นส่วนข้อมูลกับราคา
5. ราคาและบริบทของยอดอยู่ซ้าย View car อยู่ขวาบน desktop ใหญ่และ mobile 390px
6. บางช่วงกว้างกลาง ราคาและปุ่มแยกบรรทัดตาม responsive rule

ไม่มีกรอบล้อมทั้ง card และไม่มีพื้นสีหลังเนื้อหาทั้งใบ Body มี padding แนวนอน 2px ใน Easy Days ตาม source; ใช้ช่องว่างระหว่างคอลัมน์และ section สร้างโครงหน้า

View car ใช้พื้น soft ตัวอักษร primary, border soft, radius 8px, padding 8px 13px, min-width 94px และ width auto; desktop min-height 42px, mobile 46px Hover เปลี่ยนเป็น primary/ขาว

เปิดรายละเอียดด้วย section ต่อจากรายการ ไม่จำเป็นต้องเปิด modal ในต้นแบบ ปุ่มมี `aria-expanded` และเปลี่ยนข้อความเป็น Close เมื่อเปิด

### Images และ icons

ใช้ภาพจริงจาก catalog เมื่อมี asset ที่เหมาะสม เก็บอัตราส่วนและ object-fit ให้เปรียบเทียบกันได้ แสดง alt ที่ตรงกับภาพ ใช้ภาพตัวอย่างพร้อมคำอธิบายเมื่อยังไม่มีรูปจริง ไม่สร้างคำรับรองว่ารูปตัวอย่างคือรถหรือสถานที่ที่ระบบมีอยู่จริง

Reference assets: `public/design-v2/{airport.webp,camry.jpg,gle.jpg,suv.jpg}` พร้อม provenance และ font license รูปใน reference เป็นตัวอย่างสำหรับองค์ประกอบภาพ ไม่ใช่รายการ asset ที่ต้องใช้ถาวร

Icon ในต้นแบบเป็น SVG เส้นเดียวกัน `viewBox="0 0 24 24"`, stroke 1.7, round caps/joins จาก `app/design-options/v2/icons.tsx` ใช้ขนาด 15–20px ตามบริบท Icon ควบคุมเดี่ยวมี accessible name; icon ประกอบข้อความเป็น decorative

### Admin queue และรายละเอียด

Queue มี search, branch filter และ status tabs ก่อน table Tabs ใช้เส้น primary ใต้คำที่เลือก ไม่เปลี่ยนทุก filter เป็น filled pill

ตารางแสดง booking/customer, vehicle/branch, rental period, currency/value, status และ action ข้อมูลที่เลือกเปลี่ยนเป็นพื้น soft ชื่อหรือหมายเลขที่กดเปิดได้ใช้ primary ข้อมูลวันที่และยอดจัดแนวคงที่

รายละเอียดแสดง status, booking number, customer/contact, ภาพรถย่อ, branch, pickup/return, timezone, options, amount และ next action เรียงจากการระบุรายการ → ข้อมูลเช่า → ค่าใช้จ่าย → การตัดสินใจ

Primary action อยู่ในบริบทของ booking ที่เลือก เหตุผลปฏิเสธแสดงในฟอร์มใกล้ action ปุ่มอนุมัติกับ assign รถเป็นคนละช่วงงาน หลีกเลี่ยงการสื่อว่ากดอนุมัติแล้วได้ทะเบียนรถทันที

### Loading, empty, error และ feedback

| State | พฤติกรรมและหน้าตา |
| --- | --- |
| Loading | Skeleton พื้น soft ตามโครงรายการ/ภาพ, ปุ่ม busy มี label และกดซ้ำไม่ได้ |
| Empty | ข้อความบอกขอบเขตที่ไม่พบ เช่น branch/period/filter พร้อมทางแก้ |
| Error | บอกสิ่งที่โหลดไม่ได้และปุ่ม retry; คงค่า form/filter |
| Success/feedback | Inline message พื้น soft, primary text และข้อความผลของ action |
| Pending approval | ข้อความรอเจ้าหน้าที่ตรวจ พร้อมบริบท next step; แก้แผนแล้วล้าง confirmation เดิม |
| Disabled | ใช้ native semantics พร้อมเหตุผลในบริบท; เห็น label ชัด |

ใช้ `role="status"` กับผลที่แจ้งโดยไม่ย้าย focus และ `role="alert"` กับ error ที่ต้องรับรู้ การปิด message มีปุ่มชื่อชัดเจน สถานะผ่านทั้งสีและข้อความ

### Business behavior ที่หน้าตาต้องรักษา

- ลูกค้าจอง CarType; เจ้าหน้าที่เลือก Car จริงตอน pickup
- Checkout สร้าง `PENDING`; ผ่าน mock payment ไม่ได้แปลว่าอนุมัติแล้ว
- Approval กัน capacity และตรวจ stock options แยกจาก physical readiness
- รับและคืนสาขาเดิมใน MVP; branch แยกจาก airport
- Quote มาจาก backend ตาม business rules; UI แสดง breakdown และ price snapshot ไม่คัดลอกสูตรคำนวณ
- แสดงรหัสสกุลเงินและเวลาท้องถิ่นของสาขา แยกเงินคนละสกุลในรายงาน
- รายงานเป็น booking value ตามนิยาม ไม่กล่าวว่าเป็น cash receipts
- Auth, roles และ suspension ใช้ระบบที่มีอยู่ รายการในภาพไม่ใช่สิทธิ์ให้ bypass guards

ดู requirement ล่าสุดใน [บริบทธุรกิจ](../docs/project-context.md) สำหรับรายละเอียด ไม่เพิ่ม booking feature ใหม่เพราะ reference ภายนอกมีให้ใช้

## Do's and Don'ts

### ขั้นตอนสำหรับ Luna

1. อ่าน `AGENTS.md`, codebase map, PRODUCT.md และเอกสารนี้; ระบุหน้าที่ได้รับมอบหมาย
2. เปิดภาพ reference ที่เกี่ยวข้องก่อนตัดสิน layout อ่าน source เฉพาะ Easy Days + blue แล้วรวม base, variant และ breakpoint overrides
3. แยก product shell/components ออกจาก prototype controls และ fixtures ใช้ API และ auth เดิมสำหรับ implementation จริง
4. ใช้ token และ component vocabulary ร่วมกัน ปรับเนื้อหาและความหนาแน่นตามงาน
5. ตรวจหน้าที่ทำที่ 1440px และ 390px รวมช่วงกลางที่ layout เปลี่ยน ตามวิธีตรวจที่ AGENTS.md อนุญาต
6. เปรียบเทียบ render กับภาพอ้างอิงและตารางด้านล่าง แก้เป็นชุดแล้วตรวจซ้ำเฉพาะจุดที่เปลี่ยน
7. ส่งเส้นทางเปิดดู รายการตรวจ และข้อจำกัดจริง ระบุ adaptations ที่จำเป็นต่อเนื้อหา/accessibility

### เกณฑ์ส่งงาน

- [ ] body/html เป็นขาวและ browser controls เป็น light แม้เครื่องใช้ dark preference
- [ ] primary/soft/text/border ตรง token; สีอื่นมีหน้าที่สถานะหรือเป็นสีของภาพ
- [ ] Manrope โหลดจริง ไม่ถูก global CSS override ด้วย Arial/Geist โดยไม่ตั้งใจ
- [ ] หน้าแรก desktop ฟอร์มซ้าย ภาพขวา; mobile ฟอร์มก่อนภาพ
- [ ] Form desktop เป็น 2×2 + ปุ่มเต็มแถว ไม่ใช้ search bar แบบ Open Road
- [ ] Vehicle card แบบเปิด ไม่มีกรอบครอบทั้งใบ; ภาพโค้ง 18px
- [ ] Desktop รถสามคอลัมน์; 501–800px สองคอลัมน์; ไม่เกิน 500px หนึ่งคอลัมน์
- [ ] Header, buttons, input, status, table และ detail มีหน้าตาร่วมกันข้ามหน้า
- [ ] Desktop admin sidebar ขาว active น้ำเงิน; summary/detail ฟ้าอ่อน; ตารางอ่านง่าย
- [ ] ใช้งานด้วย keyboard ได้ มี labels, focus, error association และ non-color state cues
- [ ] Text contrast อย่างน้อย 4.5:1; large text/control contrast ตามบทบาทอย่างน้อย 3:1
- [ ] รูปและ font โหลดครบ ไม่มี document overflow หรือข้อความ/ปุ่มถูกตัด
- [ ] สภาพ loading/empty/error/busy/selected/expanded และ long-content ใช้งานได้
- [ ] การแก้ branch/date ไม่ค้าง pending confirmation ของแผนเดิม
- [ ] คง semantics ของ pending, approval และ assignment ตลอด flow
- [ ] ไม่มี review toolbar, design chooser, mock customer records หรือ sample price logic หลุดสู่หน้าใช้งานจริง

### สัญญาณว่าธีมเริ่มหลุด

หากเกิดสิ่งเหล่านี้ ให้กลับมาเทียบ reference: body ถูกย้อมฟ้า/ครีม, ปุ่มหลักเปลี่ยนเป็นส้ม/เขียว, hero กลายเป็น search bar แนวนอนแบบ Open Road, การ์ดรถมีกรอบหนาหรือเงาทุกใบ, เปลี่ยน Manrope เป็น serif/mono, headline ใหญ่จนฟอร์มถูกดันลงมาก, ใช้พื้นดำเป็น admin shell หรือใช้สีเดียวแทนสถานะทั้งหมด

การเลือก Easy Days Original อนุมัติรูปแบบและ palette ข้างต้น ส่วนการเชื่อม production ยังขึ้นกับ scope ของงานแต่ละครั้ง งานเอกสารรอบนี้ไม่เปลี่ยน runtime UI หรือ backend
