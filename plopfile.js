import { promises as fs } from "node:fs";
import path from "node:path";
import search from "@inquirer/search";
import chalk from "chalk";
import slugify from "slugify";

const getModules = async () => {
  const contentPath = `${process.cwd()}/src/pages/`;
  const modules = [];

  async function listDir(dir) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      const subDirPromises = files.map(async (file) => {
        if (file.isDirectory()) {
          const fullPath = path.join(dir, file.name);
          modules.push({
            name: fullPath.replace(contentPath, ""),
            value: fullPath.replace(contentPath, ""),
          });
          await listDir(fullPath);
        }
      });
      await Promise.all(subDirPromises);
    } catch (error) {
      console.error(
        chalk.red(`Error reading content for ${dir}:`, error.message),
      );
    }
  }
  await listDir(contentPath);
  return modules;
};

const modules = await getModules();

const prompts = async (inquirer) => {
  const section = await (
    await inquirer.prompt({
      type: "list",
      name: "section",
      message: "choose lesson section",
      choices: [
        {
          name: "Foundation",
          value: "foundation",
        },
        {
          name: "Studio",
          value: "studio",
        },
        {
          name: "Horizon",
          value: "horizon",
        },
      ],
    })
  ).section;
  const title = await (
    await inquirer.prompt({
      type: "input",
      name: "title",
      validate: (input) => input.length > 0,
      message: "title for this lesson",
    })
  ).title;
  const navTitle = await (
    await inquirer.prompt({
      type: "input",
      name: "navTitle",
      validate: (input) => input.length > 0,
      message: "title that appears in nav",
    })
  ).navTitle;
  const slug = await (
    await inquirer.prompt({
      type: "input",
      name: "slug",
      default: slugify(title, {
        lower: true,
        strict: true,
      }),
      message: "slug for lesson",
      validate: (input) => /^[a-z0-9-]+$/.test(input) || "use a valid URL slug",
    })
  ).slug;
  const mod = await search({
    name: "module",
    message: "which module does thie lesson belong to? (autocomplete)",
    pageSize: 10,
    validate: (input) =>
      /^[a-z0-9\-_/]+$/.test(input) ||
      "Use a valid directory path (no spaces or special characters)",
    source: async (value) => {
      if (!value)
        return modules
          .filter((m) => m.name.indexOf(section) !== -1 && m.name !== section)
          .map((m) => {
            return {
              name: m.name.substring(m.name.indexOf("/") + 1),
              value: m.value.substring(m.value.indexOf("/") + 1),
            };
          });
      const options = [
        {
          name: `Create module: ${value}`,
          value,
        },
        ...modules
          .filter(
            (m) =>
              m.name.indexOf(value) !== -1 &&
              m.name.indexOf(section) !== -1 &&
              m.name !== section,
          )
          .map((m) => {
            return {
              name: m.name.substring(m.name.indexOf("/") + 1),
              value: m.value.substring(m.value.indexOf("/") + 1),
            };
          }),
      ];
      return options;
    },
  });
  return {
    section,
    title,
    navTitle,
    slug,
    mod,
  };
};

const createLesson = (plop) => {
  plop.setGenerator("new lesson", {
    description: "new lesson",
    prompts,
    actions: [
      {
        type: "add",
        path: `${process.cwd()}/src/pages/{{section}}/{{mod}}/{{slug}}/page.mdx`,
        templateFile: "src/templates/lesson.mdx",
        transform: (template, data) =>
          template
            .replace("LessonTitle", data.title)
            .replace("NavTitle", data.navTitle)
            .replace(),
      },
    ],
  });
};

export default createLesson;
