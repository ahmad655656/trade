# 🌟 Trade - منصة التجارة B2B المتكاملة

## 📖 وصف المشروع
**Trade** هي منصة تجارة إلكترونية B2B متقدمة تربط بين **التجار (المشترين)** و**الموردين (البائعين)** لتسهيل عمليات الشراء والبيع الآمنة والفعالة للمنتجات والسلع. مبنية بأحدث التقنيات مثل Next.js 15+, Prisma، Cloudinary، وذكاء اصطناعي للبحث.

الهدف: توفير سوق رقمي شامل يدعم التجارة الدولية مع ضمان الأمان، الشفافية، والكفاءة.

## 🚀 الميزات الرئيسية
- **المصادقة الآمنة**: تسجيل/دخول، 2FA، KYC للموردين، التحقق من الهوية.
- **بحث ذكي بالـ AI**: بحث متقدم بمساعدة OpenAI، Transformers.js، تاريخ البحث.
- **إدارة المنتجات**: عرض كتالوج المنتجات، إضافة/تحرير مع رفع صور Cloudinary.
- **سلة وطلبات التاجر**: سلة مشتريات، طلبات، عناوين شحن، دفع، إيصالات.
- **التواصل**: رسائل فورية، محادثات، إشعارات صوتية/بصرية.
- **لوحة تحكم شاملة**: للتجار، الموردين (تحليلات، طلبات، مراجعات، محفظة، طرق شحن)، والإدارة (عمولات، نزاعات، مدفوعات، مستخدمين).
- **أدوات متقدمة**: قوائم مفضلة، RFQ (طلب عرض أسعار)، مراجعات، wishlist، كشف احتيال.
- **دعم متعدد اللغات**: عربي/إنجليزي (logoarabic.png)، RTL support.

## 💎 الفوائد
- **للتجار**: الوصول السريع لآلاف المنتجات من موردين موثوقين، أسعار تنافسية، عملية شراء سلسة مع حماية في النزاعات والإرجاع.
- **للموردين**: عرض منتجات عالمي، زيادة المبيعات، إدارة KYC/شحن/محفظة سهلة، عمولات شفافة.
- **للإدارة**: مراقبة كاملة للمنصة، سجلات تدقيق، إدارة النزاعات والمدفوعات بكفاءة.

## 💪 نقاط القوة
- **تقنيات حديثة**: Next.js App Router، TypeScript، Tailwind CSS، HeadlessUI، Lucide icons.
- **أمان عالي**: bcryptjs، JWT، 2FA، fraud.ts، audit logs، security events.
- **أداء فائق**: Server Actions، Streaming AI، تحسين صور Cloudinary، قواعد بيانات Neon/PG.
- **قابلية التوسع**: API RESTful شاملة، Email integration (Resend)، Webhooks جاهزة.
- **تطوير مستمر**: TODOs لـ Navbar، Search UI، Deployment، Cloudinary fixes.

## 📄 الصفحات الرئيسية
| الصفحة | الوصف |
|--------|--------|
| `/` | الصفحة الرئيسية مع AiSearchDropdown |
| `/login` `/register` | تسجيل الدخول/التسجيل |
| `/search` | البحث الذكي مع SearchClient |
| `/products` | قائمة المنتجات |
| `/suppliers` `/suppliers/[id]` | قائمة وقوائم الموردين الشخصية |
| `/suppliers/[id]/products` `/new` | كتالوج المنتجات وإضافة جديد |
| `/trader/cart` `/orders` `/addresses` `/products` | أدوات التاجر الكاملة |
| `/dashboard` `/dashboard/admin` | لوحات التحكم |
| `/messages` | مساحة الرسائل |
| `/about` `/privacy` `/terms` `/dispute-policy` `/supplier-agreement` | الصفحات القانونية والمعلوماتية |
| `/traders/[id]` | صفحات التجار |

## 🛠️ تشغيل المشروع
```bash
npm install
npx prisma generate
npm run dev
```
افتح [http://localhost:3000](http://localhost:3000).

للنشر: `npm run build` ثم deploy على Vercel.

## 📚 تقنيات المشروع (من package.json)
- **Frontend**: Next.js 16+, React 19, TailwindCSS 4
- **Backend**: Prisma 7.5 + Neon/PG, API Routes
- **AI**: @ai-sdk/openai, @xenova/transformers
- **Auth/Security**: jose, jsonwebtoken, bcryptjs
- **Media**: Cloudinary
- **UI**: HeadlessUI, Lucide, React Hook Form + Zod

شكراً لاستخدام **Trade**! 🚀✨

[Next.js Docs](https://nextjs.org/docs) | [Prisma Studio](npx prisma studio)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
