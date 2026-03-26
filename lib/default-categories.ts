import { prisma } from '@/lib/prisma'

type DefaultCategory = {
  slug: string
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
}

const defaultCategories: DefaultCategory[] = [
  {
    slug: 'food-beverages',
    nameAr: 'الأغذية والمشروبات',
    nameEn: 'Food & Beverages',
    descriptionAr: 'مواد غذائية، مشروبات، ومنتجات استهلاكية يومية.',
    descriptionEn: 'Groceries, beverages, and daily consumables.',
  },
  {
    slug: 'grains-rice-sugar',
    nameAr: 'الحبوب والأرز والسكر',
    nameEn: 'Grains, Rice & Sugar',
    descriptionAr: 'أرز، سكر، برغل، وحبوب متنوعة.',
    descriptionEn: 'Rice, sugar, bulgur, and assorted grains.',
  },
  {
    slug: 'spices-condiments',
    nameAr: 'البهارات والمنكهات',
    nameEn: 'Spices & Condiments',
    descriptionAr: 'توابل، بهارات، صلصات، ومنكهات.',
    descriptionEn: 'Spices, seasonings, sauces, and condiments.',
  },
  {
    slug: 'dairy-eggs',
    nameAr: 'الألبان والبيض',
    nameEn: 'Dairy & Eggs',
    descriptionAr: 'حليب، أجبان، لبن، وبيض ومنتجاتها.',
    descriptionEn: 'Milk, cheese, yogurt, eggs, and related products.',
  },
  {
    slug: 'frozen-food',
    nameAr: 'الأغذية المجمدة',
    nameEn: 'Frozen Food',
    descriptionAr: 'منتجات مجمدة جاهزة أو نصف جاهزة.',
    descriptionEn: 'Ready and semi-ready frozen products.',
  },
  {
    slug: 'fruits-vegetables',
    nameAr: 'الخضار والفواكه',
    nameEn: 'Fruits & Vegetables',
    descriptionAr: 'خضار وفواكه طازجة أو معبأة.',
    descriptionEn: 'Fresh or packed fruits and vegetables.',
  },
  {
    slug: 'bakery-sweets',
    nameAr: 'المخبوزات والحلويات',
    nameEn: 'Bakery & Sweets',
    descriptionAr: 'خبز، معجنات، وحلويات شرقية وغربية.',
    descriptionEn: 'Bread, pastries, and sweets.',
  },
  {
    slug: 'snacks-confectionery',
    nameAr: 'الوجبات الخفيفة والحلويات',
    nameEn: 'Snacks & Confectionery',
    descriptionAr: 'شيبس، بسكويت، شوكولا، وسكريات.',
    descriptionEn: 'Chips, biscuits, chocolate, and candies.',
  },
  {
    slug: 'household-cleaning',
    nameAr: 'المنظفات المنزلية',
    nameEn: 'Household Cleaning',
    descriptionAr: 'منظفات، مطهرات، وأدوات تنظيف.',
    descriptionEn: 'Detergents, disinfectants, and cleaning tools.',
  },
  {
    slug: 'personal-care',
    nameAr: 'العناية الشخصية',
    nameEn: 'Personal Care',
    descriptionAr: 'شامبو، صابون، معقمات، وعناية يومية.',
    descriptionEn: 'Shampoo, soap, sanitizers, and daily care products.',
  },
  {
    slug: 'health-medical',
    nameAr: 'الصحة والمستلزمات الطبية',
    nameEn: 'Health & Medical Supplies',
    descriptionAr: 'مستلزمات طبية وصحية استهلاكية.',
    descriptionEn: 'Medical and health consumables.',
  },
  {
    slug: 'baby-mother',
    nameAr: 'مستلزمات الأم والطفل',
    nameEn: 'Baby & Mother',
    descriptionAr: 'حفاضات، أغذية أطفال، والعناية بالأم.',
    descriptionEn: 'Diapers, baby food, and mother care products.',
  },
  {
    slug: 'home-kitchen',
    nameAr: 'المنزل والمطبخ',
    nameEn: 'Home & Kitchen',
    descriptionAr: 'أدوات مطبخ، ومستلزمات منزلية متنوعة.',
    descriptionEn: 'Kitchenware and home essentials.',
  },
  {
    slug: 'furniture-decor',
    nameAr: 'الأثاث والديكور',
    nameEn: 'Furniture & Decor',
    descriptionAr: 'أثاث منزلي ومكتبي ومواد ديكور.',
    descriptionEn: 'Home/office furniture and decor items.',
  },
  {
    slug: 'electronics-appliances',
    nameAr: 'الإلكترونيات والأجهزة',
    nameEn: 'Electronics & Appliances',
    descriptionAr: 'أجهزة كهربائية وإلكترونية مختلفة.',
    descriptionEn: 'Electrical and electronic appliances.',
  },
  {
    slug: 'mobile-accessories',
    nameAr: 'ملحقات الجوال والإكسسوارات',
    nameEn: 'Mobile Accessories',
    descriptionAr: 'شواحن، كابلات، حافظات، وسماعات.',
    descriptionEn: 'Chargers, cables, covers, and headsets.',
  },
  {
    slug: 'computers-office',
    nameAr: 'الحواسيب والمستلزمات المكتبية',
    nameEn: 'Computers & Office',
    descriptionAr: 'لابتوبات، طابعات، قرطاسية ومستلزمات مكتب.',
    descriptionEn: 'Laptops, printers, and office supplies.',
  },
  {
    slug: 'fashion-clothing',
    nameAr: 'الألبسة والموضة',
    nameEn: 'Fashion & Clothing',
    descriptionAr: 'ملابس رجالية ونسائية وأطفال.',
    descriptionEn: 'Men, women, and kids clothing.',
  },
  {
    slug: 'shoes-bags',
    nameAr: 'الأحذية والحقائب',
    nameEn: 'Shoes & Bags',
    descriptionAr: 'أحذية، حقائب، محافظ ومنتجات جلدية.',
    descriptionEn: 'Shoes, bags, wallets, and leather goods.',
  },
  {
    slug: 'jewelry-watches',
    nameAr: 'الإكسسوارات والساعات',
    nameEn: 'Jewelry & Watches',
    descriptionAr: 'ساعات، إكسسوارات، ومجوهرات بسيطة.',
    descriptionEn: 'Watches, accessories, and simple jewelry.',
  },
  {
    slug: 'sports-fitness',
    nameAr: 'الرياضة واللياقة',
    nameEn: 'Sports & Fitness',
    descriptionAr: 'معدات رياضية ومنتجات لياقة.',
    descriptionEn: 'Sports equipment and fitness products.',
  },
  {
    slug: 'tools-hardware',
    nameAr: 'الأدوات والعدد',
    nameEn: 'Tools & Hardware',
    descriptionAr: 'عدد يدوية وكهربائية ومستلزماتها.',
    descriptionEn: 'Hand/electric tools and accessories.',
  },
  {
    slug: 'construction-materials',
    nameAr: 'مواد البناء',
    nameEn: 'Construction Materials',
    descriptionAr: 'مواد إنشائية، دهانات، ولوازم صيانة.',
    descriptionEn: 'Construction supplies, paints, and maintenance items.',
  },
  {
    slug: 'agriculture-supplies',
    nameAr: 'المستلزمات الزراعية',
    nameEn: 'Agriculture Supplies',
    descriptionAr: 'بذور، أسمدة، ومعدات زراعية.',
    descriptionEn: 'Seeds, fertilizers, and farming tools.',
  },
  {
    slug: 'auto-parts',
    nameAr: 'قطع السيارات',
    nameEn: 'Auto Parts',
    descriptionAr: 'قطع غيار، زيوت، وإكسسوارات سيارات.',
    descriptionEn: 'Spare parts, oils, and car accessories.',
  },
  {
    slug: 'packaging-disposables',
    nameAr: 'مواد التغليف والمستهلكات',
    nameEn: 'Packaging & Disposables',
    descriptionAr: 'أكياس، عبوات، مواد تغليف، واستخدام مرة واحدة.',
    descriptionEn: 'Bags, containers, packaging, and disposables.',
  },
  {
    slug: 'pet-supplies',
    nameAr: 'مستلزمات الحيوانات الأليفة',
    nameEn: 'Pet Supplies',
    descriptionAr: 'غذاء الحيوانات وإكسسوارات العناية.',
    descriptionEn: 'Pet food and care accessories.',
  },
  {
    slug: 'books-education',
    nameAr: 'الكتب والتعليم',
    nameEn: 'Books & Education',
    descriptionAr: 'كتب، وسائل تعليمية، وحقائب مدرسية.',
    descriptionEn: 'Books, educational tools, and school supplies.',
  },
]

export async function ensureDefaultCategories() {
  for (const item of defaultCategories) {
    await prisma.category.upsert({
      where: { slug: item.slug },
      update: {
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        description: item.descriptionEn,
      },
      create: {
        slug: item.slug,
        name: item.nameEn,
        nameAr: item.nameAr,
        nameEn: item.nameEn,
        description: item.descriptionEn,
      },
    })
  }
}
