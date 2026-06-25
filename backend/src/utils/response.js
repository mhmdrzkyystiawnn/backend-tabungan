export const success = (
    res,
    message,
    data = null,
    status = 200
) => {

    return res.status(status).json({
        success: true,
        message,
        data
    });

};

export const fail = (
    res,
    message,
    status = 400,
    errors = null
) => {

    return res.status(status).json({
        success: false,
        message,
        errors
    });

};