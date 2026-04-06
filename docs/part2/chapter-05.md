# Chương 5: React 19 Actions, Optimistic Updates & Transitions



*Chương này cover:*

- **5.1** `useTransition` và `startTransition`: tách urgent vs non-urgent updates
- **5.2** `useOptimistic`: cập nhật UI trước khi server phản hồi
- **5.3** Form Actions và `useActionState` trong React 19
- **5.4** Skeleton loading và Suspense boundaries đúng cách
- **5.5** Exercise: Xóa khách hàng với optimistic UI (full solution)


Từ Chương 1 đến Chương 4, chúng ta đã xây dựng một nền tảng vững chắc: các component an toàn kiểu dữ liệu, hệ thống quản lý state bằng reducer, và lớp data fetch tái sử dụng với custom hooks. Nhưng có một vấn đề cốt lõi về trải nghiệm người dùng (UX) chưa được giải quyết: độ trễ của mạng. Trong mô hình React truyền thống, khi người dùng thực hiện một hành động (ví dụ: xoá một khách hàng), chúng ta bật cờ `isLoading = true`, hiển thị một spinner, chờ API trả về thành công, và cuối cùng fetch lại danh sách. Quy trình này chính xác, an toàn, nhưng *chậm chạp*. Ở góc độ người dùng, việc phải chờ 500ms chỉ để thấy một mục biến mất khỏi danh sách tạo ra cảm giác ứng dụng bị ì ạch.

React 19 mang đến một sự thay đổi mô hình (paradigm shift) thực sự với **Actions** và bộ ba hook quyền lực: `useTransition`, `useOptimistic`, và `useActionState`. Chương này sẽ hướng dẫn bạn cách sử dụng các siêu năng lực mới này để tạo ra ảo giác về một ứng dụng tức thời (instant UI). Bằng cách tách biệt các bản cập nhật khẩn cấp (urgent) khởi khỏi các bản cập nhật có thể chờ (non-urgent), và cập nhật giao diện *trước khi* server xác nhận, quy trình làm việc của CRM Dashboard sẽ chuyển từ "nhấn và chờ" sang "nhấn và tiếp tục".

---

### 5.1 `useTransition` và `startTransition`: Tách Lẽ Cập Nhật

Trong các phiên bản React cũ, mọi state update đều được coi là khẩn cấp (urgent). Nếu bạn gõ vào ô tìm kiếm và quá trình lọc danh sách bên dưới tiêu tốn 200ms CPU, chữ bạn vừa gõ cũng bị đứng hình trên màn hình trong suốt 200ms đó. React 18 giới thiệu khái niệm *Transitions*, và React 19 đẩy nó lên thành trung tâm của kiến trúc ứng dụng.

Transitions cho phép bạn nói với React: *"Cập nhật ô input này ngay lập tức. Còn việc lọc danh sách 10.000 khách hàng kia? Hãy làm trong background, và nếu tôi gõ thêm chữ mới thì hủy việc lọc cũ đi"*.

**Cú pháp cơ bản của `useTransition`**

```tsx [src/components/SearchExample.tsx]
import { useState, useTransition } from 'react';
import type { CustomerListItem } from '@types/customer';

function SearchExample({ customers }: { customers: CustomerListItem[] }) {
  const [inputValue, setInputValue] = useState('');     // Urgent state
  const [searchQuery, setSearchQuery] = useState('');   // Non-urgent state
  const [isPending, startTransition] = useTransition();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // 1. Cập nhật input value ngay lập tức (urgent) — UI phản hồi tức thì
    setInputValue(value);

    // 2. Wrap state update nặng trong startTransition (non-urgent)
    startTransition(() => {
      // React sẽ render lại với searchQuery mới trong background
      // Nếu user tiếp tục gõ, render này bị hủy bỏ (interrupted)
      setSearchQuery(value);
    });
  };

  // Tính toán nặng dựa trên searchQuery (không phải inputValue)
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <input value={inputValue} onChange={handleSearchChange} />
      {/* isPending giúp hiển thị loading indicator nhẹ nhàng */}
      {isPending && <span>Đang lọc...</span>}
      
      <CustomerTable data={filteredCustomers} opacity={isPending ? 0.6 : 1} />
    </div>
  );
}
```

**Transition vs Debounce**

Ở Chương 4, chúng ta đã dùng `useDebounce` để trì hoãn việc lọc. Vậy `useTransition` có thay thế debounce không? 

Không hoàn toàn. Chúng giải quyết hai khía cạnh khác nhau:
- **Debounce:** Giải quyết vấn đề *số lượng gọi rác*. Dùng khi việc lọc dẫn đến một **Network request (gọi API)**. Bạn muốn tránh spam API server 10 lần khi user gõ 10 ký tự nhanh.
- **Transition:** Giải quyết vấn đề *block UI thread* và *lỗi thiết kế ưu tiên render*. Dùng khi việc cập nhật state dẫn đến một **Render tốn kém trên client**. Bạn muốn giao diện không bị giật lag dù React phải vẽ lại hàng ngàn DOM nodes.

Trong những UI tìm kiếm nội bộ không gọi API (filter dữ liệu đã cache trên client), `useTransition` mang lại trải nghiệm mượt mà hơn rất nhiều so với debounce, vì nó chạy ở tốc độ tối đa của máy tính thay vì bị ép chờ một khoảng delay cố định.

::: tip Bí kíp Production
Trong React 19, `startTransition` có thể nhận một *async function*. Nó không chỉ được dùng cho render nặng mà còn là nền tảng báo hiệu cho React biết một quá trình "chạy nền" (như mutation API hoặc routing) đang diễn ra. Khái niệm này được gọi là **Actions**.
:::

---

### 5.2 `useOptimistic`: Cập Nhật UI Trước Khi Server Phản Hồi

Quay lại ví dụ xoá khách hàng. Luồng thông thường (Pessimistic - bi quan) mất khoảng 500ms. Optimistic UI (Lạc quan) đảo ngược luồng này: ngay khi user bấm "Xoá", chúng ta giả vờ rằng request đã thành công, gỡ khách hàng đó khỏi UI ngay lập tức trong 0ms, sau đó mới gọi API. Nếu API lỗi, chúng ta roll back (khôi phục) giao diện về trạng thái ban đầu và hiện thông báo lỗi.

React 19 cung cấp hook `useOptimistic` được thiết kế riêng cho việc này. Nó loại bỏ toàn bộ code boilerplate phức tạp liên quan đến việc viết logic rollback bằng tay.

**Cách hoạt động của `useOptimistic`**

Hook này nhận vào hai tham số: trạng thái thực sự (ground truth) và hàm reducer để tính toán trạng thái lạc quan. Dưới đây là cách tích hợp vào CRM Dashboard khi thay đổi trạng thái khách hàng (Status).

```tsx [src/components/CustomerStatusUpdater.tsx]
import { useOptimistic, useTransition, type FC } from 'react';
import type { CustomerListItem, CustomerStatus } from '@types/customer';
import StatusBadge from '@components/ui/StatusBadge';
import Button from '@components/ui/Button';

// Giả lập một hàm gọi API (action) chậm
async function updateCustomerStatusOnServer(id: string, newStatus: CustomerStatus) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Giả lập 20% khả năng gọi lỗi để test rollback
      if (Math.random() < 0.2) reject(new Error('Network Error!'));
      resolve({ success: true });
    }, 800);
  });
}

interface Props {
  customer: CustomerListItem;
  // Hàm này từ parent component hoặc mutate callback từ React Query/SWR
  onStatusUpdate: (id: string, status: CustomerStatus) => Promise<void>;
}

const CustomerStatusUpdater: FC<Props> = ({ customer, onStatusUpdate }) => {
  const [isPending, startTransition] = useTransition();

  // useOptimistic state
  // Tham số 1: Trạng thái thật (đến từ props, là ground truth)
  // Tham số 2: Hàm tính trạng thái ảo. Tham số 'optimisticValue' do ta tự đẩy vào
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    customer.status, // type: CustomerStatus
    (currentStatus, optimisticValue: CustomerStatus) => optimisticValue
  );

  const handleUpdate = (newStatus: CustomerStatus) => {
    // Để useOptimistic hoạt động, nó PHẢI được bọc trong một Transition (khái niệm Action)
    startTransition(async () => {
      try {
        // 1. Cập nhật UI ngay lập tức (không delay)
        setOptimisticStatus(newStatus);
        
        // 2. Thực hiện gọi API thật. Trong thời gian này, UI đang hiển thị newStatus.
        await updateCustomerStatusOnServer(customer.id, newStatus);
        
        // 3. Nếu thành công, cập nhật state thật trên Parent.
        // Khi state thật trên Parent đổi -> component rerender -> useOptimistic tự đồng bộ lại.
        await onStatusUpdate(customer.id, newStatus);
      } catch (error) {
        // Nếu lỗi, Transition kết thúc. useOptimistic tự động xả bỏ giá trị ảo (newStatus)
        // và tự phục hồi hiển thị giá trị thật (customer.status từ props).
        console.error('Update failed:', error);
        alert('Cập nhật thất bại. Đã khôi phục trạng thái cũ.');
      }
    });
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      {/* Hiển thị trạng thái ảo nếu đang pending, ngược lại là trạng thái thật */}
      <div style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        <StatusBadge status={optimisticStatus} />
      </div>

      {optimisticStatus !== 'active' && (
        <Button size="sm" onClick={() => handleUpdate('active')} disabled={isPending}>
          Mark Active
        </Button>
      )}
      {optimisticStatus !== 'churned' && (
        <Button variant="danger" size="sm" onClick={() => handleUpdate('churned')} disabled={isPending}>
          Mark Churned
        </Button>
      )}
    </div>
  );
};

export default CustomerStatusUpdater;
```

**Tại sao `useOptimistic` mạnh mẽ?**

Điểm kỳ diệu nằm ở chỗ: biến `optimisticStatus` không phải là cục state tồn tại vĩnh viễn (như `useState`). Nó là một cái "bóng" chỉ tồn tại trong vòng đời của một Transition. Ngay khi `startTransition` kết thúc (dù try hay catch block thi hành xong), cái bóng này bị vứt bỏ, và `optimisticStatus` lại trở thành giá trị thật `customer.status`. 

Nếu không có hook này, một update lạc quan phải viết vô số `useState` loằng ngoằng, phải giữ ref của old data, và phải viết logic revert bằng tay trong hàm `catch`!

---

### 5.3 Form Actions và `useActionState` (React 19)

Thế giới Front-end những năm vừa qua bị ám ảnh bởi Controlled Components (các input được kiểm soát qua `onChange` và `useState`). Trong React 19, thẻ `<form>` lấy lại quyền lực vốn có của HTML, tích hợp thẳng vào khái niệm Server Actions và Client Actions.

Hooks mới `useActionState` (trước đây từng được gọi là `useFormState` trong bản Canary) giúp quản lý toàn bộ vòng đời của việc submit form: pending, success, server errors, mà không cần một mớ `useState` rối rắm.

```tsx [src/components/CreateCustomerForm.tsx]
import { useActionState, type FC } from 'react';
import Button from '@components/ui/Button';

// Mock API Call Action
async function createCustomerAction(
  prevState: { message: string; success: boolean }, 
  formData: FormData
) {
  // Giả lập processing chậm
  await new Promise(r => setTimeout(r, 1000));
  
  const rawData = {
    name: formData.get('name') as string,
    email: formData.get('email') as string,
  };

  // Validation đơn giản (Chương 6 sẽ dùng Zod chuyên nghiệp hơn)
  if (!rawData.name || !rawData.email) {
    return { message: 'Vui lòng điền đủ tên và email', success: false };
  }

  // Submit OK
  return { message: `Đã thêm khách hàng: ${rawData.name}`, success: true };
}

const CreateCustomerForm: FC = () => {
  // Tham số: (Hàm Action, Trạng thái Inital State)
  const [state, formAction, isPending] = useActionState(createCustomerAction, {
    message: '',
    success: false,
  });

  return (
    <form 
      action={formAction} // Truyền thẳng vào thuộc tính action (React 19 feature!)
      style={{
        display: 'flex', flexDirection: 'column', gap: '1rem',
        maxWidth: '400px', background: 'var(--color-surface)', padding: '1.5rem',
        borderRadius: '0.5rem', border: '1px solid var(--color-border)'
      }}
    >
      <h3 style={{ color: 'var(--color-text-primary)' }}>Thêm Khách Hàng</h3>

      <input
        type="text"
        name="name"         // Bắt buộc phải có 'name' để FormData đọc được
        placeholder="Tên khách hàng"
        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)' }}
      />

      <Button type="submit" variant="primary" isLoading={isPending} disabled={isPending}>
        {isPending ? 'Đang thêm...' : 'Lưu dữ liệu'}
      </Button>

      {/* Thông báo trả về từ Action */}
      {state?.message && (
        <p style={{
          fontSize: '0.875rem',
          color: state.success ? '#16a34a' : '#dc2626'
        }}>
          {state.message}
        </p>
      )}
    </form>
  );
};

export default CreateCustomerForm;
```

**Tại sao việc này quan trọng?**

Không có `e.preventDefault()`. Không có `const [name, setName] = useState('')`. Mọi thứ dựa trên Native FormData. Khi Form được render ở Next.js Server Components, Actions có thể sống trên Server và UI vẫn chạy kể cả khi JavaScript trên máy Client chưa load xong. Chúng ta đã trở lại cách Web thuần tuý hoạt động, nhưng được gia cố bằng sức mạnh Interactive của React.

(Lưu ý: Sang Chương 6 chúng ta sẽ mổ xẻ Form mạnh mẽ hơn khi kết hợp với thư viện Zod validation và Ref để xoá trắng data sau khi thêm mới).

---

### 5.4 Skeleton Loading và Suspense Boundaries Đúng Cách

Cùng với Transitions, Suspense (`<Suspense>`) không còn là rào cản thử nghiệm, mà là công dân hạng nhất. Thay vì kiểm tra thủ công `if (isLoading) return <Spinner/>` như trong `useFetch` Chương 4, mô hình Suspense cho phép data layer ném ra một Promise khi đang đợi data, và component Parent sẽ bắt dính để vẽ ra Fallback UI (thường là bộ khung Skeleton mờ nhạt).

**Pattern: Tránh Waterfall Fetching**

Khi sử dụng `<Suspense />`, một lỗi nghiêm trọng các developer thường gặp là **Waterfall**.
Nếu `Parent` suspend, nó sẽ chưa render children, nghĩa là `Children` không thể tự bốc API của nó cho tới khi Parent xong.

Quy tắc chuẩn mực để nhốt (Boundary) Suspense:
1. Fetch càng gần parent càng tốt.
2. Thả Suspense Boundary bao trọn nguyên khối layout có nghĩa. Ví dụ: Bao nguyên cái Table thay vì từng dòng một.

```tsx
import { Suspense } from 'react';

// Tạo Skeleton xám giống hệt giao diện Table
const TableSkeleton = () => (
   <div style={{ animation: 'pulse 1.5s infinite', backgroundColor: 'var(--color-surface)', height: '300px', borderRadius: '8px' }}>
     <div style={{ height: '40px', background: 'var(--color-border)', margin: '1rem' }} />
     <div style={{ height: '40px', background: 'var(--color-border)', margin: '1rem' }} />
   </div>
);

function CustomerPage() {
  return (
    <main>
      <h1>Danh sách khách hàng</h1>
      {/* Bọc component cần chọc Data Source vào qua Suspense */}
      <Suspense fallback={<TableSkeleton />}>
        {/* Component này bên trong sẽ dùng các lib có hỗ trợ Suspense (như SWR/Query) */}
        <CustomerTableWithData />
      </Suspense>
    </main>
  );
}
```

::: warning Khả năng tương thích của Suspense
Hook `useFetch` chúng ta tự viết ở Chương 4 không hoạt động với Suspense. Để component tự suspend, hàm gọi API của ta phải tuân thủ chuẩn "Throwing Promises" của React (hoặc sử dụng hook mới `use` được React 19 ra mắt), đây là một implementation tương đối phức tạp và mạo hiểm. Đối với môi trường Production, chúng tôi khuyến cáo kết hợp Suspense bằng các thư viện chuẩn như Tanstack Query hay SWR.
:::

---

### 5.5 Exercise: Tách List và Xóa Khách Hàng với Optimistic UI (Full Solution)

**Mục tiêu:** Build một Table Component tái sử dụng cho danh sách khách hàng từ `useCustomers` (Chương 4). Chúng ta sẽ thêm vào một chức năng quan trọng: **Nút xoá (Delete)**. Nút xoá này áp dụng pattern `useOptimistic` để làm dòng biến mất giật mình tức thời, mang lại cảm giác Lightning-fast!

**Yêu cầu:**
- Tách `CustomerTable` nhận vào mảng `customers` và hàm `onDeleteAction(id: string)`.
- Nhận mảng base `customers`, pass vào qua `useOptimistic` để ra `optimisticCustomers`.
- Hàm `deleteOptimistic` sẽ loại bỏ customer theo `id` khỏi mảng ảo này.
- Wrap nút Bấm Xoá vào `startTransition`, chạy `deleteOptimistic`, sau đó gọi API await.
- Nếu Delete API trả về lỗi: bắn tiếp Alert và dữ liệu tự động phục hồi khỏi Transition.

**Full Solution:**

```tsx [src/components/CustomerTable.tsx]
import { useOptimistic, useTransition, type FC } from 'react';
import type { CustomerListItem } from '@types/customer';
import StatusBadge from '@components/ui/StatusBadge';
import Button from '@components/ui/Button';

// Mock server delete action
async function deleteCustomerOnServer(id: string) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      // Giả lập 20% khả năng gọi lỗi network để test rollback pattern
      if (Math.random() < 0.2) {
        reject(new Error('Lỗi server: Không thể xoá khách hàng lúc này.'));
      } else {
        resolve(true);
      }
    }, 1000);
  });
}

interface CustomerTableProps {
  // Mảng gốc truyền xuống từ state lớn (ví dụ: useCustomers hook gọi ở Parent)
  customers: CustomerListItem[];
  // Callback thông báo cho Parent xoá thật trên State để component không bị fetch lại rác
  onConfirmDelete: (id: string) => void;
}

const CustomerTable: FC<CustomerTableProps> = ({ customers, onConfirmDelete }) => {
  const [isPending, startTransition] = useTransition();

  // useOptimistic quản lý một bản sao (bóng) của danh sách customers.
  // Hàm Reducer nhận parameter `idToRemove` định trước.
  const [optimisticCustomers, removeOptimisticCustomer] = useOptimistic(
    customers,
    (currentCustomers, idToRemove: string) => 
      currentCustomers.filter(c => c.id !== idToRemove)
  );

  const handleDelete = (id: string, name: string) => {
    // Luôn luôn hỏi trước với hành vi huỷ rủi ro cao mặc dù UI nhanh chớp nhoáng
    if (!window.confirm(`Bạn có chắc chắn muốn xoá khách hàng ${name}?`)) return;

    // Phải wrap hành động trong Action/Transition!
    startTransition(async () => {
      try {
        // 1. Cập nhật UI ngay lập tức: Dòng bị xoá sẽ biến mất khỏi bảng luôn (0ms)
        removeOptimisticCustomer(id);

        // 2. Chờ server xoá. Trong 1000ms này UI đã re-render xong việc.
        await deleteCustomerOnServer(id);

        // 3. Xoá thành công, gửi id lên parent để gỡ ra khỏi Ground Truth thật.
        onConfirmDelete(id);
      } catch (error) {
        // Nếu thất bại: Lọt vào Catch. 
        // Sau khi Catch kết thúc -> Transition xong -> optimisticCustomers = customers (dữ liệu thật gốc khôi phục).
        // Khách hàng bị xoá sẽ chớp hiện lại trên bảng như chưa từng có cuộc chia ly!
        alert((error as Error).message);
      }
    });
  };

  if (optimisticCustomers.length === 0) {
    return <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>Không có khách hàng nào.</p>;
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--color-surface)', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>Tên khách hàng</th>
            <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>Công ty</th>
            <th style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>Trạng thái</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Hành động</th>
          </tr>
        </thead>
        <tbody style={{ opacity: isPending ? 0.7 : 1, transition: 'opacity 0.2s' }}>
          {/* Lặp từ ảo: optimisticCustomers! Thay vì customers gốc */}
          {optimisticCustomers.map((c) => (
            <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                {c.name}<br/>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 'normal' }}>
                  {c.email}
                </span>
              </td>
              <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>{c.company}</td>
              <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={c.status} /></td>
              <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => handleDelete(c.id, c.name)}
                >
                  Xoá
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomerTable;
```

**Tại sao đây là code chất lượng Production cho tương lai?**

Chỉ với hook built-in `useOptimistic` gốc rễ của React 19, chúng ta đạt được cái mà trong những năm trước phải phụ thuộc vào bộ engine caching cồng kềnh như Apollo GraphQL hay Redux Toolkit Query để mô phỏng.

Hãy để ý trong solution: mảng map cho table là `optimisticCustomers`, trong khi tham số đầu vào `useOptimistic` là biến state gốc `customers`. 
Tại hàm `handleDelete`, UI gọi `removeOptimisticCustomer(id)`, ngay tức khắc React re-render table *mà không có dòng xoá*, trong khi Promise `deleteCustomerOnServer` rề rà chạy 1 giây sau mới xong. Xuyên suốt 1 giây này, state ảo vẫn đè (override) dữ liệu gốc. Bạn vừa ban phép thuật bẻ cong thời gian cho ứng dụng của mình. Nếu có lỗi, mọi thứ rollback với độ chênh lệch zero-config, xoá stress cho Developer và tạo ấn tượng kinh ngạc cho Customer.

---

> **Tiếp theo:** [Chương 6: Forms không bao giờ hỏng với Zod + React 19 →](./chapter-06), nơi chúng ta sẽ quay trở lại với Form Actions. Tại đó, những vấn đề kinh hoàng của input dữ liệu như: User nhập sai Email, nhập thiếu Input rác, Type-safe cho từng file đính kèm... sẽ được framework validation bá đạo - Zod giải quyết triệt để.
