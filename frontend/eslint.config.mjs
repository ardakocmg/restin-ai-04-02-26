import js from "@eslint/js";
import react from "eslint-plugin-react";
import globals from "globals";

export default [
    { ignores: ["**/*.ts", "**/*.tsx", "node_modules/**", "dist/**", "build/**"] },
    js.configs.recommended,
    {
        files: ["**/*.{js,jsx,mjs,cjs}"],
        languageOptions: {
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            react,
            "restin-guardrails": {
                rules: {
                    "no-hardcoded-colors": {
                        meta: {
                            type: "problem",
                            docs: {
                                description: "Disallow hardcoded colors in className without dark mode overrides",
                            },
                        },
                        create(context) {
                            return {
                                JSXAttribute(node) {
                                    if (node.name.name !== "className") return;
                                    const value = node.value;
                                    if (!value) return;

                                    if (value.type === "Literal" && typeof value.value === "string") {
                                        checkClasses(context, node, value.value);
                                    } else if (value.type === "JSXExpressionContainer" && value.expression.type === "Literal") {
                                        checkClasses(context, node, value.expression.value);
                                    }
                                }
                            };
                        }
                    }
                }
            }
        },
        rules: {
            "restin-guardrails/no-hardcoded-colors": "warn",
            "react/prop-types": "off",
            "no-unused-vars": "warn",
            "no-undef": "error"
        }
    }
];

function checkClasses(context, node, classString) {
    const classes = classString.split(/\s+/);

    // Check for hardcoded white/black without dark variant
    const hasBgWhite = classes.includes("bg-white");
    const hasTextBlack = classes.includes("text-black");
    const hasDarkBg = classes.some(c => c.startsWith("dark:bg-"));
    const hasDarkText = classes.some(c => c.startsWith("dark:text-"));

    if (hasBgWhite && !hasDarkBg) {
        context.report({ node, message: "Using 'bg-white' without 'dark:bg-...' breaks dark mode at night. Use 'bg-background' or 'bg-card' for automatic switching." });
    }
    if (hasTextBlack && !hasDarkText) {
        context.report({ node, message: "Using 'text-black' without 'dark:text-...' creates invisible text in dark mode. Use 'text-foreground'." });
    }

    // Check for hex codes
    if (/text-\[#000000\]|text-\[#000\]/.test(classString)) {
        context.report({ node, message: "Hardcoded hex black is forbidden. Use semantic tokens." });
    }
}
