import { makeAnimeReactionCommand } from '../../utils/animeReaction.js';

export default makeAnimeReactionCommand({
  name: 'animepat',
  endpoint: 'pat',
  verb: 'patted',
  selfAction: false
});
