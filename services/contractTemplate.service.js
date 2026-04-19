const { Op } = require('sequelize');
const ContractTemplate = require('../models/contractTemplate.model');

// GET /api/contract-templates
const getAllTemplates = async (query = {}) => {
    const { page = 1, limit = 10, search, is_active } = query;
    const offset = (page - 1) * limit;
    const where = {};

    if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
    }
    if (search) {
        where.name = { [Op.iLike]: `%${search}%` };
    }

    const { count, rows } = await ContractTemplate.findAndCountAll({
        where,
        limit: Number(limit),
        offset: Number(offset),
        order: [['createdAt', 'DESC']],
    });

    return {
        total: count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(count / limit),
        data: rows,
    };
};

// GET /api/contract-templates/:id
const getTemplateById = async (id) => {
    const template = await ContractTemplate.findByPk(id);
    if (!template) throw { status: 404, message: 'Không tìm thấy mẫu hợp đồng' };
    return template;
};

// POST /api/contract-templates
const createTemplate = async (data, userId) => {
    if (!data.name) throw { status: 400, message: 'Tên mẫu hợp đồng là bắt buộc' };
    if (!data.content) throw { status: 400, message: 'Nội dung mẫu (HTML) là bắt buộc' };
    if (!data.version) throw { status: 400, message: 'Phiên bản mẫu là bắt buộc' };

    if (data.is_default) {
        await ContractTemplate.update({ is_default: false }, { where: { is_default: true } });
    }

    return ContractTemplate.create({
        ...data,
        created_by: userId,
        variables: data.variables || [],
    });
};

// PUT /api/contract-templates/:id
const updateTemplate = async (id, data) => {
    const template = await ContractTemplate.findByPk(id);
    if (!template) throw { status: 404, message: 'Không tìm thấy mẫu hợp đồng' };

    if (data.is_default) {
        await ContractTemplate.update(
            { is_default: false },
            { where: { is_default: true, id: { [Op.ne]: id } } }
        );
    }

    await template.update(data);
    return template;
};

// DELETE /api/contract-templates/:id (soft delete)
const deleteTemplate = async (id) => {
    const template = await ContractTemplate.findByPk(id);
    if (!template) throw { status: 404, message: 'Không tìm thấy mẫu hợp đồng' };

    await template.update({ is_active: false });
    return { message: `Đã vô hiệu hóa mẫu hợp đồng "${template.name}"` };
};

module.exports = { getAllTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate };