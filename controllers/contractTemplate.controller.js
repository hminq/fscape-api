const templateService = require('../services/contractTemplate.service');

const handleError = (res, err) => {
    console.error('[ContractTemplateController]', err);
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    return res.status(status).json({ message });
};

const getAllTemplates = async (req, res) => {
    try {
        const result = await templateService.getAllTemplates(req.query);
        return res.status(200).json(result);
    } catch (err) { return handleError(res, err); }
};

const getTemplateById = async (req, res) => {
    try {
        const template = await templateService.getTemplateById(req.params.id);
        return res.status(200).json({ data: template });
    } catch (err) { return handleError(res, err); }
};

const createTemplate = async (req, res) => {
    try {
        const template = await templateService.createTemplate(req.body, req.user.id);
        return res.status(201).json({ message: 'Template created', data: template });
    } catch (err) { return handleError(res, err); }
};

const updateTemplate = async (req, res) => {
    try {
        const template = await templateService.updateTemplate(req.params.id, req.body);
        return res.status(200).json({ message: 'Template updated', data: template });
    } catch (err) { return handleError(res, err); }
};

const deleteTemplate = async (req, res) => {
    try {
        const result = await templateService.deleteTemplate(req.params.id);
        return res.status(200).json(result);
    } catch (err) { return handleError(res, err); }
};

module.exports = { getAllTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate };
