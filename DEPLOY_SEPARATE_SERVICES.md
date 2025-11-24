# Deploy Frontend và Backend Riêng Biệt trên Render

## Tổng Quan

- **Backend Service**: API server chạy Express.js
- **Frontend Service**: Next.js application riêng biệt

## 1. Deploy Backend Service

### Tạo Web Service mới trên Render:

- Name: `dgtech-backend`
- Environment: `Node`
- Build Command: `npm run build:backend`
- Start Command: `npm run start:backend`
- Instance Type: Free

### Environment Variables cho Backend:

```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLOUDINARY_CLOUD_NAME=djm8ilpwy
CLOUDINARY_API_KEY=621864642568489
CLOUDINARY_API_SECRET=HQALdiBzFmSTEEgDdzo7eXO6mbs
SEPAY_API_TOKEN=2BR6HE5UB1OTQMZLFVF6M5U0ICE4TXCMP7CBXLANJQWNK83EICQKPLOP34HDA92Y
SEPAY_ACCOUNT_NUMBER=0365448803
SEPAY_ACCOUNT_NAME=DGtech
SEPAY_BANK_CODE=MBBank
FRONTEND_URL=https://dgtech-frontend.onrender.com
```

**URL Backend**: `https://dgtech-backend.onrender.com`

## 2. Deploy Frontend Service

### Tạo Web Service mới trên Render:

- Name: `dgtech-frontend`
- Environment: `Node`
- Build Command: `npm run build:frontend`
- Start Command: `npm run start:frontend`
- Instance Type: Free

### Environment Variables cho Frontend:

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://dgtech-backend.onrender.com/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**URL Frontend**: `https://dgtech-frontend.onrender.com`

## 3. Cấu Hình Clerk

Trong Clerk Dashboard, thêm các domains:

- Frontend URLs:
  - `https://dgtech-frontend.onrender.com`
  - `http://localhost:3000` (development)
- Backend Webhook URL:
  - `https://dgtech-backend.onrender.com/api/webhooks/clerk`

## 4. Test Deployment

### Test Backend:

```bash
curl https://dgtech-backend.onrender.com/api/categories
```

### Test Frontend:

Truy cập: `https://dgtech-frontend.onrender.com`

## 5. Development Local

### Chạy Backend:

```bash
cd backend
npm install
npm start
```

Backend chạy ở: `http://localhost:5000`

### Chạy Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy ở: `http://localhost:3000`

Tạo file `.env.local` trong frontend:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## Lưu Ý Quan Trọng

1. **CORS**: Backend đã được cấu hình để chấp nhận requests từ frontend URL riêng
2. **Cookies**: `withCredentials: true` đã được set để cookies hoạt động cross-origin
3. **Environment Variables**: Frontend cần `NEXT_PUBLIC_API_URL` trỏ đến backend
4. **Free Tier**: Render free tier sẽ sleep sau 15 phút không hoạt động - lần đầu truy cập có thể chậm

## Ưu Điểm của Kiến Trúc Này

✅ Frontend và Backend scale độc lập
✅ Dễ debug và maintain
✅ Frontend có thể dùng CDN nếu muốn
✅ Backend có thể serve nhiều frontend khác nhau
✅ Phù hợp với kiến trúc microservices
