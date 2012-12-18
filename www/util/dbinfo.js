module.exports = {
    mongo: {
        todo: {
            host:   '127.0.0.1',
            port:   27017,
            db:     'todo',
            auth:   {
                username: 'todo',
                password: 'T4Bmj3LcZmvD'
            },
            collections: {
                // Allow all collection names...
                indexOf: function() {
                    return true;
                }
            }
        },
        
        meeveep: {
            host:   '127.0.0.1',
            port:   27017,
            db:     'meeveep',
            auth:   {
                username: 'meeveep',
                password: 'T4Bmj3LcZmvD'
            },
            collections: ['users','stars', 'cards']
        }
    }
}
