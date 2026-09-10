-- ============================================================================
-- Bằng Lăng Hill — dữ liệu 6 phòng
--
-- SINH TỰ ĐỘNG bởi scripts/gen-rooms-seed.cjs — đừng sửa tay.
-- Nguồn: src/constants/roomOptions.js (tên thật) + src/constants/roomData.js (giá, ảnh)
--
-- Tên phòng lấy theo roomOptions.js vì đó là tên thật đang dùng ở trang quản lý;
-- roomData.js tự ghi ở dòng đầu là "Mock data".
-- Cột features cũ bị bỏ: cả 6 phòng đều là ['Cozy','Queen Bed','Intimate'] —
-- dấu vết copy-paste, không nơi nào hiển thị.
-- ============================================================================

insert into public.rooms (
    code, name, room_type, sort_order,
    price_weekday, price_weekend, price_holiday,
    extra_person_fee, capacity, size_label, bed_type,
    description, amenities, images, thumbnail
) values
    ('1001', 'Bungalow Bằng Lăng', 'bungalow', 0,
     800000, 1000000, 1500000,
     150000, 4, '45m²', '2 giường',
     'Một không gian rộng rãi và thoải mái với thiết kế bungalow truyền thống. Phòng được trang bị đầy đủ tiện nghi hiện đại trong không gian ấm cúng, gần gũi với thiên nhiên.',
     ARRAY['Giường đôi king size', 'Phòng tắm riêng với vòi sen', 'Điều hòa không khí', 'TV màn hình phẳng', 'Tủ lạnh mini', 'Ấm đun nước', 'Ban công riêng với view vườn', 'WiFi miễn phí']::text[],
     ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=800']::text[],
     'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400'),
    ('1002', 'Bungalow Nguyệt Quế', 'bungalow', 1,
     600000, 800000, 1200000,
     150000, 2, '30m²', '1 giường',
     'Bungalow nhỏ xinh với không gian ấm cúng, thích hợp cho cặp đôi hoặc khách du lịch một mình. Thiết kế tối giản nhưng đầy đủ tiện nghi cần thiết.',
     ARRAY['Giường đôi queen size', 'Phòng tắm riêng', 'Điều hòa không khí', 'TV LCD', 'Tủ lạnh mini', 'Ấm đun nước', 'Hiên nhỏ', 'WiFi miễn phí']::text[],
     ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800']::text[],
     'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400'),
    ('1003', 'Bungalow Giáng Hương', 'bungalow', 2,
     600000, 800000, 1200000,
     150000, 2, '32m²', '1 giường',
     'Bungalow nhỏ với view hồ nước, tạo cảm giác thư giãn và bình yên. Không gian được thiết kế theo phong cách nhiệt đới với nhiều cây xanh xung quanh.',
     ARRAY['Giường đôi queen size', 'Phòng tắm riêng với bồn tắm', 'Điều hòa không khí', 'TV màn hình phẳng', 'Tủ lạnh mini', 'Máy pha cà phê', 'Hiên với view hồ', 'WiFi miễn phí']::text[],
     ARRAY['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800', 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800']::text[],
     'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400'),
    ('1005', 'Phòng số 2', 'room', 3,
     800000, 1000000, 1500000,
     150000, 3, '35m²', '2 giường',
     'Phòng rộng rãi với thiết kế hiện đại, có thể chứa tới 3 người. Không gian thoáng mát với cửa sổ lớn và ánh sáng tự nhiên.',
     ARRAY['Giường đôi + giường đơn', 'Phòng tắm riêng', 'Điều hòa không khí', 'TV màn hình lớn', 'Tủ lạnh', 'Bàn làm việc', 'Sofa nhỏ', 'WiFi miễn phí']::text[],
     ARRAY['https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800', 'https://images.unsplash.com/photo-1549294413-26f195200c16?w=800']::text[],
     'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=400'),
    ('1006', 'Phòng số 3', 'room', 4,
     800000, 1000000, 1500000,
     150000, 4, '40m²', '2 giường',
     'Phòng lớn nhất trong loại phòng thường với thiết kế sang trọng. Có ban công riêng và view đẹp, thích hợp cho gia đình nhỏ hoặc nhóm bạn.',
     ARRAY['Giường đôi + 2 giường đơn', 'Phòng tắm riêng với vòi sen mưa', 'Điều hòa không khí 2 chiều', 'TV smart 50 inch', 'Tủ lạnh lớn', 'Bàn làm việc rộng', 'Khu vực tiếp khách', 'Ban công riêng', 'WiFi miễn phí']::text[],
     ARRAY['https://images.unsplash.com/photo-1562790351-d273a961e0e9?w=800', 'https://images.unsplash.com/photo-1595154103014-923b47d7e7b0?w=800', 'https://images.unsplash.com/photo-1540518614846-7eded47c9fb3?w=800']::text[],
     'https://images.unsplash.com/photo-1562790351-d273a961e0e9?w=400'),
    ('1004', 'Phòng số 4', 'room', 5,
     600000, 800000, 1200000,
     150000, 2, '25m²', '1 giường',
     'Phòng nhỏ gọn và tiện nghi, thích hợp cho khách có ngân sách hạn chế nhưng vẫn muốn trải nghiệm không gian thoải mái và sạch sẽ.',
     ARRAY['Giường đôi', 'Phòng tắm chung', 'Quạt trần', 'TV nhỏ', 'Tủ đựng đồ', 'Bàn làm việc nhỏ', 'WiFi miễn phí']::text[],
     ARRAY['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800']::text[],
     'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400')
on conflict (code) do update set
    name             = excluded.name,
    room_type        = excluded.room_type,
    sort_order       = excluded.sort_order,
    price_weekday    = excluded.price_weekday,
    price_weekend    = excluded.price_weekend,
    price_holiday    = excluded.price_holiday,
    extra_person_fee = excluded.extra_person_fee,
    capacity         = excluded.capacity,
    size_label       = excluded.size_label,
    bed_type         = excluded.bed_type,
    description      = excluded.description,
    amenities        = excluded.amenities,
    images           = excluded.images,
    thumbnail        = excluded.thumbnail,
    updated_at       = now();
