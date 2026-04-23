const { embeddingModel } = require('../config/gemini');
const { getPineconeIndex } = require('../config/pinecone');
const { sequelize } = require('../config/db');
const { QueryTypes } = require('sequelize');

/**
 * Chuyển đổi một object thành text chunk có ngữ nghĩa
 */
const buildBuildingChunk = (b) =>
  `Tòa nhà: ${b.name}. Địa chỉ: ${b.address}. Khu vực/Vị trí: ${b.location_name || 'Không rõ'}. Mô tả: ${b.description || 'Không có'}. Số tầng: ${b.total_floors || 'Không rõ'}. Trạng thái: ${b.is_active ? 'Đang hoạt động' : 'Ngừng hoạt động'}. Tổng số phòng: ${b.total_rooms ?? 'Không rõ'}. Phòng còn trống có thể thuê: ${b.available_rooms ?? 'Không rõ'}. Tiện ích đi kèm: ${b.facilities || 'Chưa cập nhật'}. Gần các trường đại học: ${b.nearby_universities || 'Không rõ'}.`;

const buildUniversityChunk = (u) =>
  `Trường Đại Học/Cao Đẳng: ${u.name}. Địa chỉ: ${u.address || 'Không rõ'}. Khu vực/Vị trí: ${u.location_name || 'Không rõ'}. Các tòa nhà gần đây: ${u.nearby_buildings || 'Chưa cập nhật'}.`;

const buildRoomChunk = (r) =>
  `Phòng số ${r.room_number} tại tòa nhà ${r.building_name}. Loại phòng: ${r.room_type_name} (${r.area_sqm ? r.area_sqm + 'm²' : ''}). Tầng: ${r.floor || 'Không rõ'}. Giá thuê: ${r.base_price ? Number(r.base_price).toLocaleString('vi-VN') + ' VNĐ/tháng' : 'Không rõ'}. Trạng thái phòng: ${translateRoomStatus(r.status)}. Sức chứa: ${r.capacity_min || 1}-${r.capacity_max || 1} người. Phòng ngủ: ${r.bedrooms || 1}, Phòng tắm: ${r.bathrooms || 1}. Trang bị trong phòng: ${r.assets || 'Tiêu chuẩn theo loại phòng'}.`;

const buildRoomTypeChunk = (rt) =>
  `Loại phòng: ${rt.name}. Mô tả: ${rt.description || 'Không có'}. Giá cơ bản: ${Number(rt.base_price).toLocaleString('vi-VN')} VNĐ/tháng. Đặt cọc: ${rt.deposit_months || 1} tháng. Diện tích: ${rt.area_sqm || 'Không rõ'}m². Sức chứa ${rt.capacity_min}-${rt.capacity_max} người. Phòng ngủ: ${rt.bedrooms}, phòng tắm: ${rt.bathrooms}. Danh sách trang thiết bị đi kèm: ${rt.assets || 'Chưa có thông tin'}.`;

const buildFacilityChunk = (f) =>
  `Tiện ích: ${f.name}. Tòa nhà có tiện ích này: ${f.building_names || 'Không rõ'}.`;

function translateRoomStatus(s) {
  const map = { AVAILABLE: 'Còn trống', OCCUPIED: 'Đang thuê', LOCKED: 'Tạm khóa' };
  return map[s] || s;
}

/**
 * Tạo embedding vector cho một đoạn text
 */
async function embedText(text) {
  const result = await embeddingModel.embedContent(text);
  const raw = result.embedding.values;
  if (!raw || raw.length === 0) {
    throw new Error(`Empty embedding returned for text: "${text.slice(0, 50)}"`);
  }
  // Chuyển về plain number[] — Pinecone SDK v7 yêu cầu regular Array
  return Array.from(raw);
}

/**
 * Upsert một batch vectors vào Pinecone
 */
async function upsertBatch(index, vectors) {
  if (vectors.length === 0) {
    console.log('[upsertBatch] Skipped — empty array');
    return;
  }
  const first = vectors[0];
  console.log(`[upsertBatch] → ${vectors.length} records | id="${first.id}" | values.length=${first.values?.length}`);
  // Pinecone SDK v7: upsert nhận {records: [...]} thay vì direct array
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await index.upsert({ records: batch });
  }
}

/**
 * Sync toàn bộ knowledge base từ PostgreSQL vào Pinecone
 */
async function syncKnowledge() {
  const index = getPineconeIndex();
  let totalUpserted = 0;

  // ── Kiểm tra kết nối Pinecone với dummy vector ──────────────────
  console.log('[KnowledgeSync] Testing Pinecone connectivity...');
  const dummyVector = {
    id: '__connectivity-test__',
    values: Array(3072).fill(0.001),
    metadata: { type: 'test', content: 'ping' }
  };
  await index.upsert({ records: [dummyVector] });

  console.log('[KnowledgeSync] ✅ Pinecone connectivity OK');

  // Xóa tất cả vector cũ trước khi sync để purge dữ liệu hợp đồng cũ
  try {
    console.log('[KnowledgeSync] Deleting all existing vectors...');
    await index.deleteAll();
    console.log('[KnowledgeSync] ✅ All old vectors deleted');
  } catch (error) {
    console.warn('[KnowledgeSync] Warning: Failed to deleteAll() which is fine if index is empty', error.message);
  }

  // ── 1. Buildings ──────────────────────────────────────────────
  const buildings = await sequelize.query(
    `SELECT b.id, b.name, b.address, b.description, b.total_floors, b.is_active, l.name as location_name,
            (SELECT COUNT(*) FROM rooms r WHERE r.building_id = b.id AND r.deleted_at IS NULL) as total_rooms,
            (SELECT COUNT(*) FROM rooms r WHERE r.building_id = b.id AND r.deleted_at IS NULL AND r.status = 'AVAILABLE') as available_rooms,
            (SELECT STRING_AGG(DISTINCT f.name, ', ') 
             FROM facilities f 
             JOIN building_facilities bf ON f.id = bf.facility_id 
             WHERE bf.building_id = b.id) as facilities,
            (SELECT STRING_AGG(DISTINCT u.name, ', ') 
             FROM universities u 
             WHERE u.location_id = b.location_id AND u.is_active = true) as nearby_universities
     FROM buildings b
     LEFT JOIN locations l ON b.location_id = l.id
     WHERE b.is_active = true`,
    { type: QueryTypes.SELECT }
  );
  console.log(`[KnowledgeSync] DB buildings fetched: ${buildings.length}`);

  const buildingVectors = [];
  for (const b of buildings) {
    const text = buildBuildingChunk(b);
    const embedding = await embedText(text);
    if (buildingVectors.length === 0) {
      console.log(`[KnowledgeSync] Embedding dimension: ${embedding.length}`);
    }
    buildingVectors.push({
      id: `building-${b.id}`,
      values: embedding,
      metadata: { type: 'building', id: b.id, content: text }
    });
  }
  await upsertBatch(index, buildingVectors);
  totalUpserted += buildingVectors.length;
  console.log(`[KnowledgeSync] ✅ Buildings upserted: ${buildingVectors.length}`);

  // ── 2. Room Types ─────────────────────────────────────────────
  const roomTypes = await sequelize.query(
    `SELECT rt.id, rt.name, rt.description, rt.base_price, rt.deposit_months, rt.capacity_min, rt.capacity_max, rt.bedrooms, rt.bathrooms, rt.area_sqm,
            (SELECT STRING_AGG(CONCAT(at.name, ' (x', rta.quantity, ')'), ', ')
             FROM room_type_assets rta
             JOIN asset_types at ON rta.asset_type_id = at.id
             WHERE rta.room_type_id = rt.id) as assets
     FROM room_types rt 
     WHERE rt.deleted_at IS NULL AND rt.is_active = true`,
    { type: QueryTypes.SELECT }
  );
  console.log(`[KnowledgeSync] DB room_types fetched: ${roomTypes.length}`);

  const rtVectors = [];
  for (const rt of roomTypes) {
    const text = buildRoomTypeChunk(rt);
    const embedding = await embedText(text);
    rtVectors.push({
      id: `roomtype-${rt.id}`,
      values: embedding,
      metadata: { type: 'room_type', id: rt.id, content: text }
    });
  }
  await upsertBatch(index, rtVectors);
  totalUpserted += rtVectors.length;
  console.log(`[KnowledgeSync] ✅ RoomTypes upserted: ${rtVectors.length}`);

  // ── 3. Rooms (joined with building + roomtype) ────────────────
  const rooms = await sequelize.query(
    `SELECT r.id, r.room_number, r.floor, r.status,
            b.name AS building_name,
            rt.name AS room_type_name, rt.base_price, rt.area_sqm,
            rt.capacity_min, rt.capacity_max, rt.bedrooms, rt.bathrooms,
            (SELECT STRING_AGG(a.name, ', ')
             FROM assets a
             WHERE a.current_room_id = r.id AND a.status = 'IN_USE') as assets
     FROM rooms r
     JOIN buildings b ON r.building_id = b.id
     JOIN room_types rt ON r.room_type_id = rt.id
     WHERE r.deleted_at IS NULL AND b.is_active = true`,
    { type: QueryTypes.SELECT }
  );

  const roomVectors = [];
  for (const r of rooms) {
    const text = buildRoomChunk(r);
    const embedding = await embedText(text);
    roomVectors.push({
      id: `room-${r.id}`,
      values: embedding,
      metadata: { type: 'room', id: r.id, content: text }
    });
  }
  await upsertBatch(index, roomVectors);
  totalUpserted += roomVectors.length;
  console.log(`[KnowledgeSync] Rooms: ${roomVectors.length}`);

  // ── 4. Facilities ─────────────────────────────────────────────
  const facilities = await sequelize.query(
    `SELECT f.id, f.name,
            STRING_AGG(DISTINCT b.name, ', ') AS building_names
     FROM facilities f
     LEFT JOIN building_facilities bf ON bf.facility_id = f.id
     LEFT JOIN buildings b ON b.id = bf.building_id
     GROUP BY f.id, f.name`,
    { type: QueryTypes.SELECT }
  );

  const facVectors = [];
  for (const f of facilities) {
    const text = buildFacilityChunk(f);
    const embedding = await embedText(text);
    facVectors.push({
      id: `facility-${f.id}`,
      values: embedding,
      metadata: { type: 'facility', id: f.id, content: text }
    });
  }
  await upsertBatch(index, facVectors);
  totalUpserted += facVectors.length;
  console.log(`[KnowledgeSync] Facilities: ${facVectors.length}`);



  // ── 7. Universities ─────────────────────────────────────────────
  const universities = await sequelize.query(
    `SELECT u.id, u.name, u.address, u.is_active, l.name as location_name,
            (SELECT STRING_AGG(DISTINCT b.name, ', ')
             FROM buildings b
             WHERE b.location_id = u.location_id AND b.is_active = true) as nearby_buildings
     FROM universities u
     LEFT JOIN locations l ON u.location_id = l.id
     WHERE u.is_active = true`,
    { type: QueryTypes.SELECT }
  );
  console.log(`[KnowledgeSync] DB universities fetched: ${universities.length}`);

  const universityVectors = [];
  for (const u of universities) {
    const text = buildUniversityChunk(u);
    const embedding = await embedText(text);
    universityVectors.push({
      id: `university-${u.id}`,
      values: embedding,
      metadata: { type: 'university', id: u.id, content: text }
    });
  }
  await upsertBatch(index, universityVectors);
  totalUpserted += universityVectors.length;
  console.log(`[KnowledgeSync] ✅ Universities upserted: ${universityVectors.length}`);

  console.log(`[KnowledgeSync] ✅ Done! Total vectors upserted: ${totalUpserted}`);
  return totalUpserted;
}

module.exports = { syncKnowledge };
