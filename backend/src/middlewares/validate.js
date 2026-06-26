import { fail } from "../utils/response.js";

const validate = (
    schema,
    target = "body"
) => {

    if (!["body", "query", "params"].includes(target)) {
        throw new Error(`Target "${target}" tidak valid.`);
    }

    return (req, res, next) => {

        const result = schema.safeParse(req[target]);

        if (!result.success) {
            return fail(
                res,
                result.error.issues[0].message,
                400
            );
        }

        req.validated = req.validated || {};
        req.validated[target] = result.data;

        next();

    };

};

export default validate;