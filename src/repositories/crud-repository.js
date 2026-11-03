const { AppError } = require('../utils');
const { StatusCodes } = require('http-status-codes');

class CrudRepository {
    constructor(model) {
        this.model = model;
    }

    async create(data, options = {}) {
        return await this.model.create(data, options);
    }

    async destroy(id) {
        const response = await this.model.destroy({
            where: { id }
        });
        if (!response) {
            throw new AppError('Resource not found to delete', StatusCodes.NOT_FOUND);
        }
        return response;
    }

    async get(id, options = {}) {
        const response = await this.model.findByPk(id, options);
        if (!response) {
            throw new AppError('Resource not found', StatusCodes.NOT_FOUND);
        }
        return response;
    }

    async getAll(options = {}) {
        return await this.model.findAll(options);
    }

    async findOne(options = {}) {
        return await this.model.findOne(options);
    }

    async findAndCountAll(options = {}) {
        return await this.model.findAndCountAll(options);
    }

    async count(options = {}) {
        return await this.model.count(options);
    }

    async update(id, data, options = {}) {
        // Verify resource exists before updating
        await this.get(id);
        await this.model.update(data, {
            where: { id },
            ...options
        });
        return await this.get(id);
    }
}

module.exports = CrudRepository;
