import type { User } from '../domain/types';
import { StateView } from '../ui/common';

// Manager / Executive dashboards are delivered in phase 3.
export default function ManagementPlaceholder({ user }: { user: User }) {
  return (
    <div className="page">
      <StateView kind="empty" title={`สวัสดี ${user.name}`}
        text="Dashboard ของ Manager และผู้บริหารอยู่ในช่วงที่ 3 ตอนนี้สลับกลับไปเป็น Marketing ได้ที่หน้าโปรไฟล์"
        action={<a className="btn primary" href="#/profile">ไปหน้าโปรไฟล์</a>} />
    </div>
  );
}
