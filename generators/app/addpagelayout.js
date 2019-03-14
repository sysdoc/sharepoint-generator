const fs = require('fs'); 
const path = require('path'); 
const { BuiltInContentTypeList } = require('sharepoint-util/lib/sharepoint/builtin');
module.exports = function addPageLayout(generator, siteDefinition, config, pl) {
    const isEdit = pl ? true : false;
    let pageLayout = pl || {
        isPageLayout:true, 
    };
    let fieldName = null; 
    const prompts = [{
        type: 'list',
        name: 'action',
        message: 'What would you like to do next?',
        choices() {
            return [
                'set title',
                'set content type',
                'set description',
                'set force overwrite when deployed',
                'set field',
                'back'
            ];
        },
        when() {
            return isEdit;
        }
    }, {
        type: 'input',
        name: 'title',
        filter(val) {
            pageLayout.title = val;
            return val;
        },
        message: 'What is the title of the page layout?',
        when(answers) {
            return !isEdit || answers.action === 'set title';
        },
        validate(val) {
            return val && val.trim() ? true : 'Please provide a valid title?';
        },
        default(answers) {
            return pageLayout.title;
        }
    }, {
        type: 'input',
        name: 'src',
        message: 'What is the source file name?',
        filter(val) {
            let fileName = val.trim();
            fileName = fileName.endsWith('.njk')?fileName:fileName+'.njk'; 
            pageLayout.template = fileName;
            pageLayout.src = path.basename(fileName, path.extname(fileName))+'.aspx'; 
            return val;
        },
        validate(val) {
            return val && val.trim() ? true : 'Please provide a valid source file name';
        },
        default(answers) {
            return pageLayout.src || (pageLayout.title && pageLayout.title.replace(/([a-z])([A-Z])/g, '$1-$2').trim().replace(/[\s]+/g, '-').toLowerCase() + '.njk');
        },
        when() {
            return !isEdit;
        }
    }, {
        type: 'input',
        name: 'description',
        filter(val) {
            pageLayout.description = val.trim();
            return val;
        },
        validate(val) {
            return val && val.trim() ? true : 'Please provide a valid description';
        },
        message: 'What is the description of the page layout?',
        when(answers) {
            return !isEdit || answers.action === 'set description';
        },
        default(answers) {
            return pageLayout.description;
        }
    }, {
        type: 'list',
        name: 'contentType',
        filter(val) {
            pageLayout.contentType = val;
            return val;
        },
        message: 'Which content type do you want to use?',
        choices(answers) {
            return [...siteDefinition.contentTypes.map(e => e.name), ...BuiltInContentTypeList];
        },
        when(answers) {
            return !isEdit || answers.action === 'set content type';
        },
        default(answers) {
            return pageLayout.contentType;
        }
    }, {
        type:'list', 
        name:'field',
        message:'Which field do you want to set?',
        choices:()=>{
            let keys = Object.keys(pageLayout.fields||{}); 
            return ['add new field',...keys]; 
        },
        default:'add new field', 
        when(answers){
            return answers.action === 'set field'; 
        }
    },{
        type:'input', 
        name:'fieldName', 
        message:'What is the name of the field?', 
        when(answers){
            return answers.field === 'add new field' && answers.action === 'set field'; 
        },
        validate(val){
            return val.trim()?true:'Please provide a valid name'; 
        },
        filter(val){
            return fieldName = val.trim(); 
        }
    },{
        type:'input', 
        name:'fieldValue', 
        message:(answers)=>{
            return `What is the value of ${answers.fieldName}?`; 
        },
        when(answers){
            return answers.action === 'set field'; 
        },
        validate(val){
            return val && val.trim()?true:'Please provide a valid value';
        },
        filter(val){
            pageLayout.fields = pageLayout.fields || {}; 
            pageLayout.fields[fieldName] = val.trim(); 
        }
    },{
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to force overwriting this file when you deploy?',
        when(answers) {
            return !isEdit || answers.action === 'set force overwrite when deployed';
        },
        filter(val) {
            pageLayout.overwrite = val;
            return val;
        },
        default() {
            return pageLayout.overwrite;
        }
    }];

    let action = null;

    return generator.prompt(prompts)
        .then((answers) => {
            action = answers.action;
            if (!isEdit) {
                siteDefinition.pageLayoutDefinitions = siteDefinition.pageLayoutDefinitions || [];
                siteDefinition.pageLayoutDefinitions.push(pageLayout);
                generator.fs.copy(path.resolve(__dirname, `../../node_modules/sharepoint-util/templates/pagelayoutmacros.${config.sharePointVersion || 'online'}.njk`),
                    generator.destinationPath(config.templatesDir, `pagelayoutmacros.${config.sharePointVersion || 'online'}.njk`), {});
                generator.fs.copy(path.resolve(__dirname, `../../node_modules/sharepoint-util/templates/DefaultLayout.${config.sharePointVersion || 'online'}.njk`),
                    generator.destinationPath(config.pageLayoutTemplatesDir, pageLayout.template), {});
            }
        })
        .then(() => {
            if (action !== 'back') {
                return addPageLayout(generator, siteDefinition, config, pageLayout);
            }
        });
};