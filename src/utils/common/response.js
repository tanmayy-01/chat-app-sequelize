const successResponse = (message, data = []) => {
    return {
        success: true,
        message,
        data,
        error: []
    }
};

const errorResponse = (message, error = []) => {
    return {
        success: false,
        message,
        data: [],
        error
    }
};

module.exports = {
    successResponse,
    errorResponse
}