import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animelick',
  endpoint: 'lick',
  verb: 'licked',
  selfAction: false
});
