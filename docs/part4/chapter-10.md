# Chương 10: Chiến Lược Testing Không Thể Phá Vỡ



*Chương này cover:*

- **10.1** Testing pyramid trong React: Unit, Integration, E2E
- **10.2** Vitest + Testing Library: Test component "đúng cách"
- **10.3** MSW (Mock Service Worker): Mock API ở layer hoàn hảo nhất
- **10.4** Playwright: E2E Testing luồng vận hành CRM Dashboard
- **10.5** Exercise: Test suite đầy đủ cho CustomerList (full solution)


Bạn vừa nhận một Pull Request thay đổi 300 dòng code của một Junior Developer. Nhìn sơ qua thì chức năng Giỏ hàng vẫn hoạt động. Nhưng bạn không dám bấm nút "Merge", bởi vì bạn không biết chắc chắn liệu phần Refactoring này có làm sập trang Lọc Khách hàng ở một ngóc ngách nào đó hay không. 

Nỗi ám ảnh "Regressions" (Lỗi hồi quy - sửa lỗi này lại đẻ ra lỗi cũ) là nguyên nhân số một giết chết tốc độ của một Team phát triển. Testing (Kiểm thử) sinh ra là để bạn có thể yên tâm ngủ ngon vào mỗi dịp cuối tuần.

Trong Chương 10, mở đầu cho Phần 4 - Triển Khai Doanh Nghiệp, chúng ta sẽ học cách viết Test không nhằm mục đích "chạy đủ Coverage lấy điểm", mà để **Xây dựng Mạng lưới An toàn chặn bắt Bug**. 

---

### 10.1 Kim Tự Tháp Testing Trong React 2026

Rất nhiều Developer lao vào việc làm Unit test (Kiểm thử chức năng cực nhỏ) vì nó dễ viết. Họ cặm cụi test 1 component nút bấm có đổi màu lúc Focus hay không, và bỏ qua việc kiểm định cả màn hình `Customers`. Khi lên Production, nút bấm màu đỏ rất đẹp nhưng... Click không ra Database 💥.

Hãy áp dụng **Kim Tự Tháp Testing (Testing Pyramid)** kinh điển, nay được điều chỉnh cho kỷ nguyên Server Actions và Hooks:

1. **Unit Tests (Đáy Kim tự tháp - Nhiều nhất, Rẻ nhất):** 
   - Kiểm tra các Functions, Custom Hooks độc lập (ví dụ `useCustomers`, `useMath`). 
   - *Công cụ: pure Vitest.*
2. **Integration Tests (Khối Giữa - Trọng tâm của React):** 
   - Kiểm tra xem 2-3 Component lắp với nhau có hoạt động không. Bấm nút Tăng -> Gọi Hook giảm -> Hiện ra chữ "Giảm". 
   - *Công cụ: Vitest + React Testing Library (RTL).*
3. **E2E - End To End (Đỉnh Kim tự tháp - Đắt nhất, Quan trọng nhất):** 
   - Cắm trình duyệt Chrome ảo vào website chạy thật, nhấp chuột như User, gõ chữ, kiểm tra Database. 
   - *Công cụ: Playwright (hoặc Cypress).*

> **Slogan bất hủ của Guillermo Rauch (CEO Vercel):**
> *"Hãy viết Test. Ít thôi cũng được. Chủ yếu nhắm vào Integration Test."*

---

### 10.2 Vitest + Testing Library: Viết Test Chống "Gãy"

Vào thời đại của Vite, *Jest* đã quá già cỗi và cồng kềnh. **Vitest** tương thích 100% cú pháp Jest nhưng nhanh hơn gấp 10 lần nhờ khai thác Hot Module Replacement của Vite Engine.

React Testing Library (RTL) có một triết lý thiết kế đanh thép: *"Component của bạn hoạt động giống hệt cách Người Dùng tương tác với nó càng nhiều, thì Test của bạn càng vững chắc"*.

Thay vì bạn tìm Component qua tên Class `className="btn-red"`, bạn tìm nó thông qua Text hiển thị hoặc Aria-role: `screen.getByRole('button', { name: "Xóa" })`. Bởi vì Người dùng không hề biết nút đó có Class là gì, họ chỉ nhìn chữ "Xóa"!

**Tích hợp `Vitest` và `RTL` cho component Input Error (Chương 6):**

```tsx [src/components/ui/__tests__/Input.test.tsx]
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event'; // Thư viện giả lập tương tác ngón tay user
import { describe, it, expect } from 'vitest';
import Input from '../Input';

describe('Component Component: Nhập liệu an toàn', () => {
  it('Hiển thị chuẩn Label và nhận ký tự gõ', async () => {
    // 1. Phép Render ảo
    render(<Input label="Tên khách hàng" name="customerName" />);
    
    // 2. Định nghĩa User và Phép tìm kiếm (Find by Role - UX centric)
    const user = userEvent.setup();
    const inputElement = screen.getByLabelText('Tên khách hàng');

    // 3. Giả lập Typing
    await user.type(inputElement, 'TuanLee Otw');

    // 4. Assertion (Khẳng định kết quả)
    expect(inputElement).toHaveValue('TuanLee Otw');
  });

  it('In ra mảng lỗi Zod khi có lỗi truyền vào', () => {
    // Render giả với thuộc tính đỏ Error
    render(
      <Input 
        label="Email" name="email" 
        error={['Sai cú pháp @', 'Hơi ngắn']} 
      />
    );

    // Kẻ mắt nhìn vào Màn hình DOM, tìm Text của lỗi. 
    expect(screen.getByText('Sai cú pháp @')).toBeInTheDocument();
  });
});
```

Điều gì khiến mẫu Test trên "Không thể phá vỡ"? 
Trừ khi bạn đổi hẳn chức năng (vd: bỏ Label text), còn nếu bạn đổi `<input>` thành `<div> bọc Text`, đổi CSS Flex qua Grid, Test vẫn luôn đậu! Nó đánh giá Result thay vì đánh giá Implementation (Cách thực hiện code).

---

### 10.3 MSW (Mock Service Worker): Cú Đánh Lừa Tầng Mạng

Ở điểm nghẽn Integration Test, Component sẽ `fetch()` một URL như `https://api.crm.com/users`. Khi Test chạy dưới Node.js, không có API nào bật cả! Lỗi đỏ rực màn hình.

Nhiều Dev dùng `vi.mock('axios')` hoặc mock hàm `useFetch`. Đó là một Test giòn tan (Dễ gãy). Nếu bạn đổi từ Axios sang Fetch API, toàn bộ vài trăm file Test gãy ngang, dù Component vẫn ngon.

**MSW (Mock Service Worker)** bước ra ánh sáng. MSW đứng chặn giữa đường truyền Mạng của Browser/Node. Dù bạn dùng `fetch`, `axios` hay React Query, khi Network Request văng ra, MSW "Húp" nguyên request đó và giả vờ Trả Data Json lại y hệt Server.

```bash
npm i -D msw
```

Thiết lập Trạm Trung Chuyển Ảo:

```ts [src/mocks/handlers.ts]
import { http, HttpResponse } from 'msw';

// Biến cái DB Ảo này thành nguồn cung cấp Data cho cả hệ thống Test
const dbUsers = [
  { id: '1', name: 'Bill Gates', status: 'active' },
  { id: '2', name: 'Steve Jobs', status: 'churned' },
];

export const handlers = [
  // Đón bắt mọi lệnh GET đánh thẳng vào /api/customers
  http.get('/api/customers', () => {
    return HttpResponse.json({ data: dbUsers }, { status: 200 });
  }),
  
  // Đón bắt cả lệnh DELETE giả lập
  http.delete('/api/customers/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ message: `Deleted ${id}` }, { status: 200 });
  })
];
```

Tại file setup Vitest dùng trạm này chèn vào đầu Node Process: `server.listen()`. Xong! Toàn bộ file Component Test từ nay trở đi sẽ tự động tin rằng Hệ thống Back-end luôn luôn Mở 24/7.

---

### 10.4 Playwright: End-To-End Bắt Buộc

Dù Unit Test và Integration Test full 100%, có thể xảy ra trường hợp:
1. Thẻ Nút Bấm Xoá bị cái Navbar bằng CSS đè lên (z-index lỗi). User không bao giờ click được đoạn đó. Testing Library không phát hiện được mâu thuẫn hình học này vì nó đọc Text!
2. Login thành công nhưng Route Guard nhảy nhầm hướng làm rỗng màn hình.

**Playwright** là vua của E2E testing thời hiện đại (do Microsoft phát triển, nhanh hơn Cypress). Nó sẽ bật một con Chrome ma (Headless), truy cập `localhost:5173`, và click bằng Tọạ độ X,Y màn hình thật.

```ts [playwright/e2e/customer-flow.spec.ts]
import { test, expect } from '@playwright/test';

test('Luồng Đăng nhập -> Vào Dashboard -> Xóa user -> Thành công', async ({ page }) => {
  // 1. Mở app tĩnh
  await page.goto('http://localhost:5173/login');

  // 2. Khai báo tương tác Y HỆT NGƯỜI DÙNG THẬT
  await page.fill('input[name="email"]', 'admin@crm.com');
  await page.fill('input[name="password"]', 'pass1234');
  await page.click('button:has-text("Đăng nhập")');

  // 3. Đảm bảo Guard Router thả vào Page Customer List
  await expect(page).toHaveURL('http://localhost:5173/customers');
  await expect(page.locator('h1')).toContainText('Danh sách khách hàng');

  // 4. Tìm kiếm đúng Người tên "TuanLee"
  await page.fill('input[placeholder="Tìm khách hàng..."]', 'TuanLee');

  // Chờ cái dòng tên TuanLee lấp ló xuất hiện
  const targetRow = page.locator('tr', { hasText: 'TuanLee' });
  await targetRow.waitFor(); 
  
  // Xử lý Alert Confirm Popup của Window Native dội về (Chương 5 có viết Confirm)
  page.on('dialog', dialog => dialog.accept());

  // Bấm xoá ở ngay cái Dòng đó!
  await targetRow.locator('button:has-text("Xóa")').click();

  // 5. Khẳng định: Dữ kiện DOM biến mất KHÔNG CẦN CHỜ (Lợi ích Optimistic Update Ch.5 !!)
  await expect(targetRow).toHaveCount(0); // Bốc hơi lập tức
});
```

Điều vĩ đại của đoạn E2E test trên là nó *vô thần* (agnostic) với Framework. Dù sau này bạn đập bỏ React để viết lại bằng Vue, Svelte hay jQuery, kịch bản Test này của Playwright vĩnh viễn đúng! Nó giúp QA và Dev ngủ một giấc sâu không mộng mị sát ngày Release.

---

### 10.5 Exercise: Viết Luồng Integration Trọn Gói CustomerList Với MSW + RTL

**Mục tiêu:** Bạn hãy chứng minh `CustomerTable.tsx` ở Chương 5 có thể tự đổ List Database ảo. Và quan trọng nhất: khi Click nút Xóa báo lỗi 500 từ Server, Optimistic UI (nhờ Zustand/React19) tự động trả mảng về y cũ và hiện Toast Đỏ! Thao tác chứng minh nằm gọn trong 1 file `test`.

**Yêu cầu:** 
- Render component bao kèm bộ bọc Component Global. 
- Chuẩn bị trạm MSW quăng lỗi 500 ở API Delete. 
- Click xóa (Khung hình 1: Record biến mất).
- Đợi 1 giây (Khung hình 2: Lệnh Try-Catch sập, Toast Error hiện, Record phục kích mọc trở lại DOM).

**Full Solution:**

```tsx [src/components/__tests__/CustomerTableOptimistic.test.tsx]
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import CustomerTable from '../CustomerTable';
import ToastContainer from '../layout/ToastContainer'; // Chứa Global Toasts

// 1. Mock MSW chuyên biệt cho File Test Này
const server = setupServer(
  http.delete('/api/customers/123-id', () => {
    return HttpResponse.json({ message: "DB Deadlock Fire" }, { status: 500 });
  })
);

// Bật MSW Hooks
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Bỏ qua Window Confirm Alert của JS
window.confirm = vi.fn().mockImplementation(() => true);

describe('Integration Test: Tự phục hồi Optimistic Xoá Thất Bại', () => {
  it('Nên giấu dòng Data đi, văng Notification Toast Lỗi, sau đó vẽ lại Data Lỗi!', async () => {
    const user = userEvent.setup();
    const MOCK_DATA = [{ id: '123-id', name: 'Elon Musk', email: 'e@x.com', status: 'active', company: 'X' }];
    const fakeConfirmAction = vi.fn(); // Spy function theo dõi

    // Khởi tạo Component với Data Giả kẹp trong Fragment ảo
    render(
      <>
        <ToastContainer />
        <CustomerTable customers={MOCK_DATA} onConfirmDelete={fakeConfirmAction} />
      </>
    );

    // Xác nhận Elon Musk ở trên màn hình
    expect(screen.getByText('Elon Musk')).toBeInTheDocument();

    // 1. Cú CLick Ngang Tàng
    const deleteBtn = screen.getByRole('button', { name: /xoá/i });
    await user.click(deleteBtn);

    // 2. Chế độ Optimistic UI React 19 Kích Hoạt -> Biến mất siêu lẹ dù API chạy chậm
    expect(screen.queryByText('Elon Musk')).not.toBeInTheDocument();

    // 3. Chờ đợi bão giông ập đến (Server MSW chọc Lỗi 500 bắn ngược lại catch())
    await waitFor(() => {
      // Báo cáo lỗi Toast hiện ra (Code nằm ở Catch block bốc Zustand Trigger notification)
      expect(screen.getByText(/Có lỗi không thể xoá/i)).toBeInTheDocument();
      // Elon musk trở về từ cõi chết (Rollback shadow state thành state gốc truyền vô)
      expect(screen.getByText('Elon Musk')).toBeInTheDocument(); 
    }, { timeout: 2000 }); // Đợi tối đa mạng load 2 giây

    // Khẳng định hàm Xóa của cha chứa state List Thật KHÔNG BAO GIỜ bị kích hoạt do Lỗi Rollback
    expect(fakeConfirmAction).not.toHaveBeenCalled();
  });
});
```

**Tại sao đây là mẫu Integration Code Production?**

Đoạn Code đã thử thách mảng khó nhằn nhất của React: State thời gian thực và Caching UI. Bằng cách gỡ `vi.mock()` và thay bằng MSW Server giả vờ lỗi, Test Runner chạy y như cách mạng kết nối bị tịt giữa chừng ngoài đời thực. User Event giả lập bấm chuẩn Click ngón tay. Bạn test không phải các mảnh Code JS vô hình, bạn đang mô phỏng hoàn thiện trải nghiệm Người Dùng gặp nạn ngặt nghèo!

Khi tất cả đèn Console báo màu xanh (PASS ✅), bạn biết Hệ thống CRM của mình là Pháo đài thép.

---

> **Tiếp theo:** [Chương 11: Cấu Trúc Dự Án Có Thể Mở Rộng Cho Nhóm Phát Triển →](./chapter-11). Mã nguồn của bạn chạy mượt mà không lỗi. Nhưng làm sao để 15 sinh viên mới tốt nghiệp nhảy vào Codebase này mà không dẫm chân lên nhau, gây ra Circle Dependency đỏ hoét hoặc File phình tới 3000 dòng? Câu trả lời nằm ở "Kiến Trúc Tương Lai" trong Chương sắp tới.
