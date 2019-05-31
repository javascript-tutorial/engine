const TutorialTree = require('engine/koa/tutorial').TutorialTree;

exports.get = async function(ctx, next) {

  let bySlugMap = Object.create(null);

  // console.log(TutorialTree.instance().bySlugMap);
  for(let entry of TutorialTree.instance().getAll()) {
    // console.log(entry);
    bySlugMap[entry.slug] = {
      githubPath: entry.githubPath,
      type: entry.constructor.name,
      children: entry.children,
      isFolder: Boolean(entry.isFolder),
      title: entry.title,
      url: entry.getUrl()
    };
  }

  ctx.body = {
    roots: TutorialTree.instance().roots,
    bySlugMap
  };

};


