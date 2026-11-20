-- ============================================================================
-- Kora Electronics — MySQL 8.0 Seed Data
-- ============================================================================
USE kora_electronics;

INSERT INTO categories (slug, name, description, sort_order) VALUES
  ('laptop', 'Laptop & Màn hình', 'Máy tính xách tay hiệu năng cao và màn hình đồ họa chuẩn màu', 1),
  ('audio', 'Âm thanh', 'Tai nghe chống ồn chủ động và thiết bị âm thanh không dây', 2),
  ('phone', 'Điện thoại & Tablet', 'Smartphone flagship và máy tính bảng OLED chuyên nghiệp', 3),
  ('accessories', 'Phụ kiện & Đồng hồ', 'Bàn phím cơ CNC, đồng hồ thông minh titanium và phụ kiện', 4)
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO products (sku, slug, name, brand, category_id, price, original_price, stock, badge, short_desc, description, specs_json, image_url, featured)
VALUES
  (
    'KR-LP-14M',
    'kora-book-pro-14',
    'KoraBook Pro 14 M4 Aluminum',
    'Kora',
    (SELECT id FROM categories WHERE slug = 'laptop'),
    34990000,
    37990000,
    18,
    'Mới ra mắt',
    'Khung nhôm nguyên khối, màn hình 14.2" OLED 120Hz, RAM 24GB, SSD 1TB.',
    'Máy tính xách tay dành cho kỹ sư phần mềm và nhà sáng tạo nội dung với khung nhôm anodize siêu bền, thời lượng pin lên đến 18 giờ và hệ thống tản nhiệt buồng hơi yên tĩnh.',
    '{"Vi xử lý":"12-Core ARM Silicon Pro","Màn hình":"14.2 inch Tandem OLED 120Hz","Bộ nhớ RAM":"24GB Unified LPDDR5X","Lưu trữ":"1TB PCIe Gen4 NVMe","Trọng lượng":"1.38 kg","Pin & Sạc":"72Wh · Sạc nhanh USB-C 100W"}',
    '/src/assets/images/prod_laptop_pro_1795140148305.jpg',
    TRUE
  ),
  (
    'KR-AU-900',
    'aurion-anc-studio-headphones',
    'Aurion Studio ANC Wireless',
    'Aurion',
    (SELECT id FROM categories WHERE slug = 'audio'),
    8490000,
    9290000,
    25,
    'Bán chạy',
    'Chống ồn chủ động thích ứng -48dB, driver Titanium 40mm, pin 45 giờ.',
    'Tai nghe chụp tai không dây với khớp nối kim loại phay xước, hỗ trợ âm thanh Lossless qua USB-C DAC tích hợp và chuẩn LDAC 24-bit/96kHz.',
    '{"Driver":"40mm Titanium Dynamic","Chống ồn":"Hybrid ANC -48dB (8 micro)","Kết nối":"Bluetooth 5.4 · USB-C Audio · 3.5mm","Thời lượng pin":"45 giờ (ANC bật)","Codec":"LDAC, AAC, SBC","Trọng lượng":"254 g"}',
    '/src/assets/images/prod_headphones_anc_1795140148135.jpg',
    TRUE
  ),
  (
    'KR-PH-16T',
    'titan-x1-flagship-5g',
    'Titan X1 Flagship 5G 512GB',
    'Titan',
    (SELECT id FROM categories WHERE slug = 'phone'),
    28990000,
    31490000,
    14,
    'Còn hàng',
    'Khung viền Titanium Grade 5, cụm 3 camera 50MP cảm biến 1 inch.',
    'Điện thoại thông minh cao cấp trang bị kính cường lực Ceramic Shield thế hệ mới, màn hình LTPO AMOLED 1-120Hz độ sáng 2600 nits và quay video Log 4K 120fps.',
    '{"Chipset":"Octa-Core 3nm Flagship","Màn hình":"6.7 inch LTPO OLED 120Hz","Camera":"50MP Chính + 48MP Ultrawide + 50MP Tele 5x","Bộ nhớ":"16GB RAM · 512GB UFS 4.0","Pin":"5100mAh · Sạc 65W / Không dây 30W","Kháng nước":"IP68"}',
    '/src/assets/images/prod_smartphone_flagship_1795140149849.jpg',
    TRUE
  ),
  (
    'KR-KB-75C',
    'kora-key-75-cnc-aluminum',
    'KoraKey 75% CNC Mechanical',
    'Kora',
    (SELECT id FROM categories WHERE slug = 'accessories'),
    4290000,
    4690000,
    32,
    'Phiên bản giới hạn',
    'Vỏ nhôm CNC nguyên khối, gasket mount, keycap PBT double-shot.',
    'Bàn phím cơ layout 75% tối giản với tạ đồng phía dưới, hỗ trợ hot-swap 5-pin, kết nối 3 chế độ (USB-C, 2.4GHz 1000Hz, Bluetooth 5.3) và firmware QMK/VIA.',
    '{"Layout":"75% (82 phím) · Gasket Mount","Chất liệu vỏ":"Nhôm 6063 Anodize CNC","Switch":"Linear Tactile Pre-lubed (Hot-swap)","Keycap":"PBT Double-shot Cherry Profile","Kết nối":"USB-C / 2.4GHz / Bluetooth 5.3","Pin":"4000mAh"}',
    '/src/assets/images/prod_keyboard_mech_1795140150484.jpg',
    TRUE
  ),
  (
    'KR-WT-02T',
    'kora-watch-ultra-titanium',
    'KoraWatch Ultra Titanium',
    'Kora',
    (SELECT id FROM categories WHERE slug = 'accessories'),
    14590000,
    15990000,
    9,
    'Sắp hết hàng',
    'Vỏ Titanium chuẩn hàng không, mặt kính Sapphire, GPS băng tần kép.',
    'Đồng hồ thông minh theo dõi sức khỏe và luyện tập chuyên sâu với cảm biến nhịp tim quang học thế hệ 4, đo SpO2, ECG và khả năng chống nước lặn sâu 100m.',
    '{"Kích thước mặt":"47mm Titanium Grade 5","Mặt kính":"Sapphire Crystal phẳng","Màn hình":"AMOLED 2000 nits Always-On","Định vị":"Dual-frequency L1+L5 GPS","Thời lượng pin":"72 giờ sử dụng hỗn hợp","Chống nước":"10 ATM / EN13319"}',
    '/src/assets/images/prod_smartwatch_titanium_1795140147598.jpg',
    FALSE
  ),
  (
    'KR-MN-27K',
    'kora-studio-display-27-5k',
    'Kora Studio Display 27" 5K',
    'Kora',
    (SELECT id FROM categories WHERE slug = 'laptop'),
    26490000,
    28990000,
    11,
    'Còn hàng',
    'Độ phân giải 5120×2880, độ phủ màu 99% DCI-P3, cổng Thunderbolt 4.',
    'Màn hình chuyên nghiệp 27 inch 5K Retina phủ lớp chống phản xạ Nano-texture, tích hợp hub Thunderbolt 4 cấp nguồn 96W và webcam Center Stage 12MP.',
    '{"Kích thước":"27 inch IPS Black 5K","Độ phân giải":"5120 × 2880 (218 PPI)","Độ sáng & Màu":"600 nits · 99% DCI-P3 (Delta E < 1)","Cổng kết nối":"1× Thunderbolt 4 (96W), 3× USB-C","Chân đế":"Nhôm điều chỉnh độ nghiêng & chiều cao","Âm thanh":"Hệ thống 6 loa Spatial Audio"}',
    '/src/assets/images/prod_monitor_studio_1795140148960.jpg',
    TRUE
  ),
  (
    'KR-EB-03S',
    'aura-buds-pro-aluminum',
    'Aura Buds Pro Aluminum',
    'Aurion',
    (SELECT id FROM categories WHERE slug = 'audio'),
    4890000,
    5490000,
    40,
    'Còn hàng',
    'Hộp sạc nhôm phay nguyên khối, chống ồn chủ động, sạc không dây Qi.',
    'Tai nghe True Wireless nhỏ gọn với driver kép đồng trục mang lại âm trầm sâu và dải cao chi tiết, khả năng đàm thoại lọc tạp âm AI 6 micro.',
    '{"Driver":"11mm Woofer + 6mm Tweeter","Chống ồn":"Adaptive ANC -45dB","Thời lượng pin":"8 giờ (tai nghe) + 28 giờ (hộp sạc)","Chống nước":"IP55 (Tai nghe)","Sạc":"USB-C & Sạc không dây Qi","Trọng lượng":"4.8g mỗi bên"}',
    '/src/assets/images/prod_earbuds_pro_1795140148551.jpg',
    FALSE
  ),
  (
    'KR-TB-13P',
    'kora-pad-pro-oled-13',
    'KoraPad Pro 13" OLED + Stylus',
    'Kora',
    (SELECT id FROM categories WHERE slug = 'phone'),
    24990000,
    26990000,
    15,
    'Kèm bút Stylus',
    'Siêu mỏng 5.1mm, màn hình OLED 120Hz, tặng kèm bút cảm ứng từ tính.',
    'Máy tính bảng chuyên dụng cho thiết kế đồ họa, phác thảo kiến trúc và làm việc di động, đi kèm bút cảm ứng độ trễ 2ms hỗ trợ 4096 mức lực nhấn.',
    '{"Màn hình":"13.0 inch Tandem OLED 120Hz","Độ mỏng":"5.1 mm · Khung nhôm tái chế","Vi xử lý":"10-Core Silicon M4","Bộ nhớ":"16GB RAM · 256GB SSD","Phụ kiện đi kèm":"Bút Kora Pencil Pro từ tính","Cổng kết nối":"Thunderbolt / USB 4"}',
    '/src/assets/images/prod_tablet_pro_1795140148265.jpg',
    TRUE
  )
ON DUPLICATE KEY UPDATE price = VALUES(price);
