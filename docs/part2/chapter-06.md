# Chương 6: Forms Không Bao Giờ Hỏng Với Zod + React 19



*Chương này cover:*

- **6.1** Tại sao validation ở client không đủ — schema validation với Zod
- **6.2** `useActionState` + Zod: form handling pattern của React 19
- **6.3** Field-level errors, dirty state, và UX tốt
- **6.4** File upload type-safe với Zod
- **6.5** Exercise: Xây dựng form thêm/sửa khách hàng đầy đủ (full solution)


Form là nơi ứng dụng của bạn giao tiếp với thế giới hỗn loạn bên ngoài. Nó nhận đầu vào từ những người dùng bình thường, những người dùng bất cẩn, hệ thống tự động điền (autofill) lỗi, và đôi khi là cả hacker. Nếu state management là việc duy trì sự nhất quán *bên trong* ứng dụng, thì form validation (xác thực biểu mẫu) là tuyến phòng thủ đầu tiên chặn đứng dữ liệu rác từ *bên ngoài*.

Ở Chương 5, thẻ `<form>` kết hợp với `useActionState` rủ bỏ được sự chậm chạp của cơ chế `useState` kiểm soát từng ký tự gõ. Nghe có vẻ hoàn hảo, nhưng Form hành động theo dạng Server Actions sẽ đẩy nhiệm vụ validate về đâu nếu không có `onChange`? Chẳng lẽ phải gửi lên Server rồi gánh Error văng về? 

Đó là lúc Zod xuất hiện. Zod không chỉ là một thư viện kiểm tra dữ liệu; nó là một "schema declaration" (khai báo cấu trúc) định nghĩa thế nào là Dữ liệu Lành mạnh. Và tuyệt vời thay, từ schema Zod, TypeScript có thể tự động infer (suy luận) ra Type. 

Trong chương này, chúng ta sẽ biến form thêm khách hàng thô sơ ở chương 5 thành một pháo đài. Mọi đầu vào sẽ được check bằng Zod ngay lập tức bên trong Action, trả về các lỗi chi tiết đến tận từng Field, đem lại trải nghiệm Form Form-Validation khắt khe nhưng lại rất mượt mà.

---

### 6.1 Tại Sao Validation Thường Lệ Không Đủ — Schema Validation Trong Zod

Cách kiểm tra Form kinh điển ai cũng từng viết:

```tsx
if (!user.name) errors.name = "Tên không được để trống";
if (user.name.length < 3) errors.name = "Tên quá ngắn";
if (!user.email.includes("@")) errors.email = "Email không hợp lệ";
```

Logic này rời rạc, lặp lại ở cả Client lẫn Server API, và quan trọng nhất: **TypeScript không biết gì về nó**. Ngay cả khi đoạn mã trên chạy qua mượt mà, biến `user.email` đối với TypeScript vẫn chỉ là một `string` lỏng lẻo. 

**Vào cuộc với Zod**

Zod cho phép bạn khai báo hình dạng (Shape) dữ liệu của mình bằng Javascript object chain. Khi dữ liệu thô (.Ví dụ FormData) lọt qua Zod thành công, đầu ra *được đảm bảo 100% là khớp* với mô tả.

Bắt đầu bằng cài đặt (nếu là dự án ngoài, dùng `npm install zod`). Trong môi trường CRM của chúng ta, khai báo một Schema sẽ được đặt ở tầng `types` nhưng nó cung cấp chức năng ở cả tầng logic:

```tsx [src/types/customerSchema.ts]
import { z } from 'zod';
import { CustomerStatus } from '@types/customer';

export const CustomerFormSchema = z.object({
  name: z.string()
    .min(3, { message: "Tên phải chứa ít nhất 3 ký tự" })
    .max(100, { message: "Tên quá dài" }),
    
  email: z.string()
    .email({ message: "Vui lòng nhập định dạng email hợp lệ (ví dụ: name@domain.com)" }),
    
  company: z.string()
    .min(2, { message: "Tên công ty phải từ 2 ký tự" })
    .optional() // Công ty có thể bỏ trống 
    .or(z.literal('')), // Rỗng cũng được tính là chuỗi trống an toàn
    
  status: z.enum(['active', 'inactive', 'prospect', 'churned'], {
    errorMap: () => ({ message: "Trạng thái không hợp lệ" })
  }).default('prospect'),
});

// Điều ma thuật nhất: Ép Schema Zod trở thành Type TypeScript thuần túy!
export type CustomerFormData = z.infer<typeof CustomerFormSchema>;
```

Zod thực hiện bước Extracting Type một cách tuyệt mĩ. Biến `CustomerFormData` sau lệnh Infer sẽ giống hệt như thế này: 

```ts
type CustomerFormData = {
  name: string;
  email: string;
  company?: string;
  status: "active" | "inactive" | "prospect" | "churned";
}
```

Bởi vì nó được xuất khẩu dựa trên runtime schema `CustomerFormSchema` - Nếu bạn sửa giới hạn min/max hay thêm một status mới vào enum, TypeScript Type sẽ TỰ ĐỘNG cập nhật the, giúp Code hoàn toàn duy trì trạng thái Single Source of Truth (Một nguồn duy nhất chuẩn). 

---

### 6.2 `useActionState` + Zod: Pattern Nhạc Trưởng Mới

Giờ đây, bạn có một Action function của Form để hứng cục `FormData` thô kệch văng ra khi người dùng ấn nút Submit. Làm sao ép nó đi qua Zod Schema và văng lỗi xuống báo cáo ở Front-End?

Chúng ta cần định nghĩa `FormState` chung nhất cho mọi Form trong hệ thống CRM:

```tsx [src/types/form.ts]
// Trạng thái trả về cho useActionState
export interface ActionState {
  success?: boolean;
  message?: string;
  // fieldErrors là một object, key là tên field (VD: email), value là mảng các lỗi
  fieldErrors?: Record<string, string[]>;
  // Truyền lại dữ liệu payload để fill ngược form khi thất bại
  payload?: any;
}
```

Và tích hợp vào vòng đời của React Action:

```tsx [src/actions/customerActions.ts]
import { CustomerFormSchema } from '@types/customerSchema';
import type { ActionState } from '@types/form';

export async function createCustomerAction(
  prevState: ActionState, 
  formData: FormData
): Promise<ActionState> {
  // Lấy dữ liệu FormData trần trụi (Native API)
  const rawData = {
    name: formData.get('name'),
    email: formData.get('email'),
    company: formData.get('company'),
    status: formData.get('status'),
  };

  // Safe parse với Zod. Nó không ném Exception lỗi code, nó trả về object dạng kết quả
  const validatedFields = CustomerFormSchema.safeParse(rawData);

  // Thất bại: Lưới rào Zod đã túm được lỗi
  if (!validatedFields.success) {
    return {
      success: false,
      message: "Biểu mẫu không hợp lệ. Vui lòng kiểm tra lại các trường.",
      // Zod tự động phẳng hóa tất cả lỗi map trùng với từng Key của Input
      fieldErrors: validatedFields.error.flatten().fieldErrors,
      payload: rawData // Lưu raw để render lại form (ko bị mất trắng data người ta gõ)
    };
  }

  // Thành công: TypeScript nhận diện validatedFields.data chính là CustomerFormData type-safe!
  const validData = validatedFields.data;

  // Gọi Database trễ giả lập
  await new Promise(r => setTimeout(r, 800));

  return {
    success: true,
    message: `Đã thêm thành công khách hàng ${validData.name}`,
    fieldErrors: {}
  };
}
```

::: tip Tại sao không dùng Hook Form quen thuộc (react-hook-form)?
RHF là quá khứ hào hùng của phiên bản React 18 trở xuống. Nhưng trong React 19, Form Actions của Native HTML chạy nhanh hơn, không tốn Javascript tải ban đầu. Các thao tác Server Action chạy liền mạch kể cả khi thiết bị máy khách chưa tải xong Hydration! Zod đứng giữa bắt lỗi là đủ nhẹ và vô đối.
:::

---

### 6.3 Field-level Errors, Dirty State Và Trải Nghiệm Tốt Nhất

Một lỗi chung của các thư viện là họ văng một dòng chữ báo lỗi tổng ở dưới nút Tóm tắt Submit: "Email invalid". Điều này làm người dùng hoang mang. Hành vi UX chuẩn của các CRM xịn là báo lỗi *ngay dưới ô Input vi phạm*, viền đỏ Input, giữ nguyên dữ liệu đã điền (dirty state) thay vì Reset trắng tinh cả Form chỉ vì lỗi một ô!

Cùng cải thiện `CreateCustomerForm` chương trước thành Production-Ready Form:

```tsx [src/components/forms/CustomerFormZod.tsx]
import { useActionState, type FC } from 'react';
import { createCustomerAction } from '@/actions/customerActions';
import Button from '@components/ui/Button';

// Utility hiển thị Helper Error
const FieldError = ({ errors }: { errors?: string[] }) => {
  if (!errors || errors.length === 0) return null;
  return (
    <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
      {errors.map((err, i) => <p key={i}>{err}</p>)}
    </div>
  );
};

const CustomerFormZod: FC = () => {
  const [state, formAction, isPending] = useActionState(createCustomerAction, {
    success: false,
    message: '',
    fieldErrors: {},
    payload: { status: 'prospect' } // Khởi tạo fallback dữ liệu
  });

  return (
    <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {state.message && (
        <div style={{
          padding: '1rem', borderRadius: '0.375rem',
          backgroundColor: state.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${state.success ? '#bbf7d0' : '#fecaca'}`,
          color: state.success ? '#166534' : '#991b1b'
        }}>
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Họ Tên Khách Hàng *</label>
        <input 
          id="name" name="name" 
          defaultValue={state.payload?.name || ""} 
          disabled={isPending}
        />
        {/* Nơi Zod văng lỗi tới tận răng */}
        <FieldError errors={state.fieldErrors?.name} />
      </div>

      <div>
        <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Địa chỉ Email *</label>
        <input 
          id="email" name="email" type="email" 
          defaultValue={state.payload?.email || ""} 
          disabled={isPending}
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label htmlFor="company" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Thuộc Công Ty</label>
          <input 
            id="company" name="company" 
            defaultValue={state.payload?.company || ""} 
            disabled={isPending}
          />
          <FieldError errors={state.fieldErrors?.company} />
        </div>
        
        <div style={{ width: '150px' }}>
          <label htmlFor="status" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>Phân Loại</label>
          <select 
            id="status" name="status" 
            defaultValue={state.payload?.status || "prospect"}
            disabled={isPending}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="prospect">Prospect</option>
            <option value="churned">Churned</option>
          </select>
          <FieldError errors={state.fieldErrors?.status} />
        </div>
      </div>

      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" isLoading={isPending}>
          Lưu Hồ Sơ
        </Button>
      </div>
    </form>
  );
};

export default CustomerFormZod;
```

*Làm cách nào UI nhở lại dữ liệu vừa nhập (dirty state)?* Thông qua chính Action return. Field `payload` trong `ActionState` return lại đống dữ liệu bị lỗi về. Chỗ HTML Form, `defaultValue={state.payload?.name || ""}` sẽ lập tức trói state cũ lên UI, không một công sức re-render thừa nào của Client bị sử dụng! 

---

### 6.4 File Upload Type-Safe Với Zod

Vấn đề rắc rối nhất của bất kỳ hệ thống CRM nào là khi Cập Nhật Avatar hay Gửi Biên lai file. File Object không có Types. Làm sao tôi biết File truyền vào FormData Action có phải là ảnh `.png` bị giả mạo thành trojan hay không?

Zod xử lý File như một công dân hạng nhất, tận dụng Browser `File` Object (Có ở Next.JS hoặc Vite DOM). 

```tsx [src/types/fileUploadSchema.ts]
import { z } from 'zod';

const MAX_FILE_SIZE = 5000000; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const ProfileImageSchema = z.object({
  // Bắt FormData bóc tách trường 'avatar' thành instance của File class
  avatar: z.instanceof(File, { message: "Vui lòng chọn một file đính kèm hợp lệ" })
    .refine((file) => file.size <= MAX_FILE_SIZE, `File avatar không được vượt quá 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Chỉ hỗ trợ định dạng .jpg, .jpeg, .png và .webp."
    )
});
```

Điều kỳ diệu của Zod-Refine `refine()` cho phép bạn thực thi custom logic lên bất kì object instance nào (Như hàm lấy Size và Type của File API gốc). Cảnh báo văng ra mượt mà y hệt như validate `string` cơ bản. 

::: warning Refine chạy ở đâu?
Tất toán Action của React 19 chạy ở Browser hay Server là chuyện của Framework (NextJs = Server, Vite SPAs = Browser). Khi Validation Zod chạy ở Client Side (React Vite), nó có đầy đủ File API để đọc. Nhưng trên NodeJS Server, hãy cẩn trọng File bị băm ra thành Buffer, khi đó InstanceOf File sẽ mất tác dụng nếu không có Polyfill FormData của Next! 
:::

---

### 6.5 Exercise: Tích Hợp Đầy Đủ Logic Khách Hàng (Tái Tổ Hợp Các Công Nghệ)

**Mục tiêu:** Bây giờ chúng ta sẽ xâu chuỗi mọi thành tựu hiện diện từ đầu Chương 1 đến giờ, chốt hạ bằng Form Tạo Khách hàng dùng bộ Khung `Zod` vừa Build. Chúng ta sẽ làm hệ thống UI tái sử dụng Input sạch sẽ để tái chế lại logic.

**Yêu cầu:**
- Xây dựng component `Input` generic (có nhãn labe, khung bọc báo lỗi error đỏ/viền đỏ nếu fail).
- Tích hợp Zod Schema Form. Khi Form thành công gọi Refresh Data và Xoá rỗng giá trị form. (Gợi ý dùng thẻ `useRef` ghim vào `form` để `ref.current.reset()` - cách xử lý gốc của Native Form).

**Full Solution:**

```tsx [src/components/ui/Input.tsx]
import { type InputHTMLAttributes, type FC } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string[];
}

// Design System Component gói gọn: Quản lý Input + Field Label + Error Traces
const Input: FC<InputProps> = ({ label, error, className, id, ...props }) => {
  const inputId = id || props.name;
  const hasError = error && error.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
      <label 
        htmlFor={inputId} 
        style={{ fontWeight: 500, fontSize: '0.875rem', color: hasError ? '#dc2626' : 'var(--color-text-primary)' }}
      >
        {label}
      </label>
      
      <input
        id={inputId}
        style={{
          padding: '0.6rem 0.75rem',
          borderRadius: '0.375rem',
          outline: 'none',
          backgroundColor: 'var(--color-surface)',
          border: `1px solid ${hasError ? '#f87171' : 'var(--color-border)'}`,
          color: 'var(--color-text-primary)',
          transition: 'all 0.2s',
          boxShadow: hasError ? '0 0 0 1px #fee2e2' : 'none' // Nổi bật viền đỏ báo lỗi
        }}
        {...props}
      />
      
      {/* Rải toàn bộ chuỗi Error Zod nếu có */}
      {hasError && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          {error.map((err, i) => (
            <span key={i} style={{ fontSize: '0.75rem', color: '#dc2626' }}>{err}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Input;
```

```tsx [src/components/forms/IntegratedCustomerForm.tsx]
import { useActionState, useRef, useEffect, type FC } from 'react';
import { createCustomerAction } from '@/actions/customerActions'; // Chứa Zod schema + action
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';

interface Props {
  // Callback bắn về Dashboard cho phép re-fetch danh sách mới nhất 
  onSuccessAppend?: () => void;
}

const IntegratedCustomerForm: FC<Props> = ({ onSuccessAppend }) => {
  // Áp dụng Ref cho thẻ form trần trụi
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(createCustomerAction, {
    success: false, 
    message: '',
    fieldErrors: {}
  });

  // Effect nhỏ bé nhưng uy quyền: Reset trang thái Native Form khi submit thành công rực rỡ
  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset(); // Native DOM API - xoá sạch input! Không cần dùng hàm setState ""
      if (onSuccessAppend) onSuccessAppend();
    }
  }, [state.success, onSuccessAppend]);

  return (
    <form 
      ref={formRef}
      action={formAction} 
      style={{ padding: '2rem', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
    >
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-text-primary)'}}>
        Đăng Ký Khách Tương Lai
      </h3>

      {/* Thông báo trạng thái Server Action */}
      {state.message && (
        <div style={{
          padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px',
          backgroundColor: state.success ? '#ecfdf5' : '#fef2f2',
          color: state.success ? '#065f46' : '#991b1b',
          borderLeft: `4px solid ${state.success ? '#10b981' : '#ef4444'}`
        }}>
          {state.message}
        </div>
      )}

      {/* Sức mạnh Input Base trỗi dậy, tái sử dụng UX đồng bộ */}
      <Input
        label="Tên Quản Lý/Khách Hàng *"
        name="name"
        placeholder="Nhập đầy đủ họ tên..."
        defaultValue={state.success ? "" : state.payload?.name}
        error={state.fieldErrors?.name}
        disabled={isPending}
      />

      <Input
        label="Địa chỉ Liên lạc Email *"
        name="email"
        type="email"
        placeholder="you@company.com"
        defaultValue={state.success ? "" : state.payload?.email}
        error={state.fieldErrors?.email}
        disabled={isPending}
      />

      <Input
        label="Doanh Nghiệp Sở Hữu (Có thể bỏ trống)"
        name="company"
        placeholder="Tên công ty"
        defaultValue={state.success ? "" : state.payload?.company}
        error={state.fieldErrors?.company}
        disabled={isPending}
      />

      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => formRef.current?.reset()}
          disabled={isPending}
        >
          Xóa Thao Tác
        </Button>
        
        <Button 
          type="submit" 
          variant="primary" 
          isLoading={isPending}
          disabled={isPending}
          style={{ flex: 1 }}
        >
          {isPending ? "Đang xử lý Zod Validate & Network..." : "Xác nhận Lập Hồ Sơ"}
        </Button>
      </div>
    </form>
  );
}

export default IntegratedCustomerForm;
```

**Tại sao đây là hệ thống Form Hoàn Hảo cho tới năm 2026?**

1. Không dùng một State JS nào để ép Buộc Dữ Liệu (`Control Component`) - UI Render nhanh nhất có thể.
2. Zod nằm giữa nhận `FormData`. Schema Infer qua TypeScript Type hoàn hảo 1-1, tránh trùng file định nghĩa type.
3. Khi lỗi: `payload` bắn trả lại dữ liệu rác, nhét lại vào `<Input defaultValue>`. 
4. Khi thành công: Native DOM function `formRef.current.reset()` xoá trôi mọi lịch sử mà không cần vòng lặp JS setState. Đạt mức Zero Layout Shift Performance. 

Và thế là Part 2 khép lại. Bức tranh về xử lý Logic Component cấp Micro và State cá nhân đã toàn vẹn.

---

> **Tiếp theo:** [Chương 7: Global State An Toàn Không Cần Redux →](../part3/chapter-07), nơi cuốn sách mở ra Phần 3. Sẽ ra sao nếu bạn cần chia sẻ dữ liệu Settings của Admin cho toàn Dashboard mà không hề có Parent Component chung nào dẫn dắt? Sẽ tới lúc bộ công cụ Global State - **Zustand** lên tiếng.
