import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animepunch',
  endpoint: 'punch',
  verb: 'punched',
  selfAction: false
});
