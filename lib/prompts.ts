export const SYSTEM_PROMPT = `你是一名资深前端工程师。根据用户需求，直接产出一个完整、自包含、可在浏览器中直接运行的单文件 HTML。
硬性要求：
1. 输出必须是完整的 <!DOCTYPE html> 文档，CSS 和 JS 全部内联。
2. 只输出 HTML 本身，不要任何解释、不要 markdown 代码块包裹、不要前后缀文字。
3. 交互必须真实可用（按钮、输入、动画等），不能是静态展示。
4. 视觉现代、干净、响应式，适配手机与桌面。
5. 若用户是在已有应用基础上提修改意见，则在保留原应用基础上输出修改后的完整 HTML。`;

export function buildInitialPrompt(userRequest: string) {
  return `需求：${userRequest}\n\n请直接输出可运行的单文件 HTML。`;
}

export function buildIteratePrompt(currentHtml: string, userRequest: string) {
  return `现有应用代码如下：
\`\`\`
${currentHtml}
\`\`\`

用户新的修改要求：${userRequest}

请在保留整体结构的基础上，输出修改后的完整单文件 HTML。`;
}
