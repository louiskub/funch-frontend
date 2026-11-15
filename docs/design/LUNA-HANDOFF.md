# Prompt สำหรับ Luna — FUNCH Easy Days · Original

คัดลอกข้อความด้านล่าง แล้วแทนบรรทัดงานด้วยหน้าหรือ feature ที่ต้องการให้ทำ:

```text
งาน: <ระบุหน้า/feature ที่ต้องการ implement>

โปรเจกต์ FUNCH Car Rental เลือกดีไซน์ Easy Days · Original และตัดสินใจใช้ shadcn/ui + Tailwind CSS
ใช้ frontend/DESIGN.md และ frontend/app/globals.css เป็นแหล่งอ้างอิงดีไซน์หลัก ห้ามเริ่มเลือก theme ใหม่

ก่อนแก้โค้ด:
1. อ่าน AGENTS.md ที่มีผลกับไฟล์เป้าหมาย และ docs/codebase-map.md
2. อ่าน frontend/PRODUCT.md และ frontend/DESIGN.md
3. เปิดภาพอ้างอิงใน frontend/docs/design/easy-days-original/
   เลือกดู desktop/mobile สำหรับหน้าลูกค้า และ admin สำหรับหลังบ้าน
4. ใช้ shadcn/ui + Tailwind CSS เป็น component library และ styling หลัก
   โดยใช้ตัวแปร token ใน frontend/app/globals.css และค่าเฉพาะใน frontend/DESIGN.md
5. อ่าน CONTEXT.md และ docs/project-context.md สำหรับ workflow และความหมายธุรกิจ

คง body สีขาว (#FFFFFF), น้ำเงิน/ฟ้าอ่อน, Manrope, spacing, rounded controls,
การ์ดรถแบบเปิด และรูปแบบ admin ตาม DESIGN.md
ใช้ components จาก shadcn/ui (Button, Card, Dialog, Table, Input, Select, Badge ฯลฯ) ที่ปรับ styling ด้วย Tailwind CSS ให้ตรงตามโทน Easy Days

เปลี่ยนเนื้อหาและข้อมูลตามหน้าที่ได้รับมอบหมาย
Reuse API, auth, components และรูปแบบที่โปรเจกต์มีอยู่
ไม่เพิ่มฟีเจอร์หรือเปลี่ยน business rules จากเว็บไซต์ reference ภายนอก

สำหรับหน้าที่ไม่มีภาพอนุมัติ ให้ใช้หัวข้อ “การนำไปใช้กับหน้าที่ไม่มีภาพตัวอย่าง”
ใน DESIGN.md เป็นแนวทางขยาย ไม่ถือว่า layout ใหม่ได้รับอนุมัติแบบ pixel-perfect
ระบุ adaptations ที่จำเป็นต่อข้อมูล ภาษา หรือ accessibility ให้ตรวจได้

ทำเฉพาะงานที่ระบุให้ครบ แล้วตรวจตาม AGENTS.md และเกณฑ์ส่งงานใน DESIGN.md
รวม desktop 1440px, mobile 390px และสถานะที่เกี่ยวข้องเมื่อวิธีตรวจของ repo อนุญาต
ส่ง URL/วิธีเปิดดู สิ่งที่เปลี่ยน ผลตรวจ และข้อจำกัดจริง
```
