# Frontend ของ Calrentar

เว็บแอปสำหรับค้นหารถ เช็กราคา ส่งคำขอจอง และจัดการข้อมูลการเช่ารถ พัฒนาด้วย Next.js App Router และ React โดยเรียก NestJS API จาก browser

[Backend repository และวิธีตั้งค่า](https://github.com/louiskub/funch-backend#readme)

## สิ่งที่ต้องมี

- Node.js 24 และ npm
- Backend ของ Calrentar ที่รันตามหัวข้อ **เริ่มใช้งานในเครื่อง** ใน README ของ Backend

## เริ่มใช้งานในเครื่อง

รันคำสั่งจากโฟลเดอร์หลักของ Frontend repository

```sh
npm ci
cp .env.example .env.local
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) หน้าเว็บจะเรียก API ที่ `http://localhost:3001/api` ตามค่าเริ่มต้น

## ทดลองจองและอนุมัติในเครื่อง

เตรียมข้อมูลจากหัวข้อ **ข้อมูลตัวอย่าง** ใน README ของ Backend ซึ่งมีคำสั่งเตรียมข้อมูลและบัญชีสำหรับทดลอง

1. ที่หน้าแรก เลือกประเทศ สาขา และรถที่ว่างในวันถัดไปหรือวันอื่นในอนาคต
2. ในหน้ารายละเอียดรถ เลือกรับรถเวลา 10:00 น. และคืนเวลา 12:00 น. ของวันเดียวกัน จากนั้นเปลี่ยนเวลาคืนเป็น 15:00 น. เพื่อดูราคาปรับเป็นรายวัน เวลาที่เลือกอิงเขตเวลาของสาขา
3. เข้าสู่ระบบด้วยบัญชีลูกค้าตัวอย่างแล้วส่งคำขอจอง หรือใช้ขั้นตอนสมัครสมาชิกพร้อมจอง ตรวจสถานะรออนุมัติที่ `/bookings` การชำระเงินเป็นแบบจำลอง
4. เปิดหน้าต่างไม่ระบุตัวตน เข้าสู่ระบบด้วยบัญชีแอดมินตัวอย่าง แล้วอนุมัติคำขอที่ `/admin/bookings` กลับไปที่หน้าลูกค้าและโหลด `/bookings` ใหม่เพื่อดูสถานะที่อัปเดต

## การตั้งค่า

ไฟล์ `.env.example` มีตัวแปรที่ frontend ใช้:

| ตัวแปร | ใช้สำหรับ | ค่าเริ่มต้น |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | URL หลักของ backend API ที่ browser เรียก | `http://localhost:3001/api` |

ตัวแปรที่ขึ้นต้นด้วย `NEXT_PUBLIC_` จะถูกส่งไปยัง browser ด้วย ตั้งค่าเป็น URL ที่ผู้ใช้เข้าถึง backend ได้ และกำหนด CORS origin ฝั่ง backend ให้ตรงกับ URL ของ frontend

## หน้าหลักและเส้นทางผู้ใช้

| URL | หน้าที่ |
| --- | --- |
| `/` | ค้นหารถตามประเทศ สาขา วันรับรถและคืนรถ หมวดรถ และเรียงราคา |
| `/offers/:offerId` | ดูรายละเอียดรถ เลือกวันและ options ตรวจ availability และทำ checkout แบบ mock |
| `/account` | เข้าสู่ระบบ สมัครบัญชี แก้ไขโปรไฟล์ และออกจากระบบ |
| `/bookings` | ดู booking ของลูกค้า แก้ไขหรือยกเลิกรายการที่ระบบอนุญาต |
| `/admin/bookings` | ตรวจคำขอ booking อนุมัติหรือปฏิเสธ จัดรถ รับรถ คืนรถ และตรวจ charges |
| `/admin/timeline` | ดูช่วงเวลาการใช้รถและ options |
| `/admin/fleet` | จัดการประเภทรถ ข้อเสนอ รถ และรูปภาพ |
| `/admin/options` | จัดการ options ราคา stock และช่วงเวลาการใช้งาน |
| `/admin/members` | ค้นหา ดูประวัติ และระงับบัญชีลูกค้า |
| `/admin/reports` | ดูรายงาน booking |

หน้า `/bookings` ต้องเข้าสู่ระบบก่อน ส่วนหน้า `/admin/*` แสดงให้บัญชีแอดมินเท่านั้น การตรวจสิทธิ์ใน frontend ใช้ควบคุมการนำทาง API ยังคงตรวจ session และ role ซ้ำที่ backend

## การทำงานของ frontend

```text
Next.js page → feature logic → API client → NestJS API → PostgreSQL
                                           ↘ MinIO สำหรับรูปภาพ
```

- `src/app/` ประกอบหน้าและ routes ด้วย Next.js App Router
- `src/features/` รวม logic, API functions, hooks, types และ state ตาม auth, bookings, catalog, admin และ i18n
- `src/components/` เก็บ component ที่ใช้ร่วมกัน เช่น navigation, guards, feedback และ UI primitives
- `src/lib/api-client.ts` รวมการเรียก API สำหรับ feature ที่ใช้ client นี้ ส่วน catalog และหน้า offer เรียก helper ใน `src/app/catalog.ts`

## ราคา เวลา และการจอง

หน้า offer แสดงค่าประมาณทันทีจากราคาและช่วงเวลาที่เลือก โดยใช้ decimal arithmetic และเขตเวลาของสาขา API ให้ราคาปัจจุบันกับ availability ของรถและ options จากนั้น frontend ใช้ข้อมูลนั้นแสดงราคาและจำนวนที่เลือกได้

เมื่อ checkout frontend ส่งยอดที่แสดงและ `checkoutKey` แบบ UUID ไปพร้อมคำขอ Backend คำนวณราคาและ availability ซ้ำก่อนบันทึก booking และใช้ key เดิมเพื่อป้องกันการสร้าง booking ซ้ำ ถ้ายอดหรือจำนวนว่างเปลี่ยน backend จะปฏิเสธคำขอ เพื่อไม่ให้บันทึกราคาหรือ availability เก่า

เวลารับและคืนรถถูกแปลงจากเวลาท้องถิ่นของสาขาเป็น ISO instant ก่อนส่ง API หน้าเว็บจะแสดง timezone ของสาขาไว้ข้างตัวเลือกวันเวลา

Checkout เป็น mock flow ไม่มีการตัดเงินจริงหรือเชื่อม payment gateway

## ภาษาและหน้าจอ

หน้าเว็บรองรับภาษาอังกฤษและภาษาไทย ข้อความแปลอยู่ใน `src/features/i18n/messages/en.json` และ `src/features/i18n/messages/th.json` ตัวเลือกภาษาถูกเก็บไว้ใน browser เพื่อใช้ครั้งถัดไป

หน้าสำหรับลูกค้ารองรับมือถือ แท็บเล็ต และ desktop ส่วนหน้าแอดมินเป็น workspace สำหรับ desktop และมีแถบนำทางสำหรับจอขนาดเล็ก

## คำสั่งสำหรับพัฒนา

```sh
npm run dev          # เริ่ม Next.js ในโหมดพัฒนา
npm run build        # สร้าง production build
npm run start        # เปิด production build
npm run lint         # รัน ESLint
npm run typecheck    # ตรวจ TypeScript
npm run check:i18n   # ตรวจ keys ในไฟล์แปลภาษาไทยและอังกฤษ
npm test             # รัน unit test ของ admin booking helpers
```
