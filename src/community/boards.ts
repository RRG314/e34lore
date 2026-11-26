import { communityCategories, communityTags } from './content';

const labels: Record<string,string> = {
  technical:'Troubleshooting', maintenance:'Maintenance & repairs', modifications:'Modifications & swaps',
  restorations:'Restoration & build journals', parts:'Parts & fitment', general:'General discussion',
  research:'Research & documentation', support:'Site feedback',
};

export const communityBoards = communityCategories.map(category=>({...category,label:labels[category.id]}));
export const boardForCategory = (category:string) => communityBoards.find(board=>board.name===category);
export const communityBoardLabel = (category:string) => boardForCategory(category)?.label ?? category;

export function communityBoardSelection(query:Record<string,string|undefined> = {}) {
  return {
    board:communityBoards.find(board=>board.id===query.board)?.id ?? '',
    tag:communityTags.find(tag=>tag.id===query.tag)?.id ?? '',
    q:(query.q??'').trim().slice(0,160),
  };
}
export type CommunityBoardSelection = ReturnType<typeof communityBoardSelection>;

export function communityBoardHref(selection:CommunityBoardSelection, path='/community') {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(selection)) if (value) params.set(key,value);
  return path+(params.size?'?'+params:'');
}

export function communityReplyHref(threadId:string, replyId:string, selection:CommunityBoardSelection) {
  const path = communityBoardHref(selection,'/community/'+encodeURIComponent(threadId));
  const reply = encodeURIComponent(replyId);
  return path+(path.includes('?')?'&':'?')+'reply='+reply+'#post-'+reply;
}
