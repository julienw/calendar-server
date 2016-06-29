/* Values are taken in this priority order:
   1. Command line flags
   2. `config/config.js`
   3. Default values detailed below */

module.exports = {
  /* Port for the REST API. Default to: 3000 */
  // httpPort: 3000,

  /* Port for the message queue. Default to: 4000 */
  // mqPort: 4000,

  /* Period between 2 polls in the database. These polls are used to find
     notifications to send. Values defined in seconds. Default to: 60 */
  // notificationPoll: 60,

  /* Google Cloud Messaging key. Used to send notifications to Chrome.
     Generate a key here: https://code.google.com/apis/console/.
     NO DEFAULT VALUE */
  gcmKey: '',

  /* Profile folder where runtime data is stored. This is a relative path from
     the project root dir. Default to: 'profiles/development' */
  // profile: 'profiles/development'
};
