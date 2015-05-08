var sqlg = require('../');


exports['test_delete'] = function( test, assert ) {
    if( !assert ) { assert = test; assert.finish = function() { this.done() } }

    assert.deepEqual( { sql: 'DELETE FROM test;', values: [] },
                      sqlg.delete( 'test', null ) );

    assert.deepEqual( { sql: 'DELETE FROM test WHERE id = $1;', values: [ 10 ] },
                      sqlg.delete( 'test', { id: 10 } ) );

    if( typeof test.finish == 'function' ) test.finish();
};
