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
        const [affectedRows] = await this.model.update(data, {
            where: { id },
            ...options
        });
        if (affectedRows === 0) {
            throw new AppError('Resource not found or no changes made', StatusCodes.NOT_FOUND);
        }
        return await this.get(id);
    }
}

module.exports = CrudRepository;