import { fail } from "../utils/response.js";

const errorHandler = (err, req, res, next) => {

    console.error(err);

    return fail(

        res,

        err.message || "Internal Server Error",

        err.statusCode || err.status || 500

    );

};

export default errorHandler;