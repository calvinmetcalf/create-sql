#node-sql-generator

SQL Generator for node.js.

## Installation

    npm install sql-generator

## Examples

### INSERT

    var SqlGenerator = require('sql-generator');
    var sqlgen = new SqlGenerator();
    var stmt = sqlgen.insert( 'test_table', // target table
                              { foo: 1, bar: 'text', buz: '2011-10-10' } // insert datas
                            );
    // it return this
    // stmt = { sql: 'INSERT INTO test_table ( foo, bar, buz ) VALUES ( $1, $2, $3 )',
                values: [ 1, 'text', '2011-10-10' ] };

### SELECT

    var SqlGenerator = require('sql-generator');
    var sqlgen = new SqlGenerator();
    var stmt = sqlgen.select( 'base_table', // target table
                              [ 'id' ], // target columns
                              { id: { '>=': 33 } } // where section
                            );
    // it return this
    // stmt = { sql: 'SELECT id FROM base_table WHERE id >= $1',
                values: [ 33 ] };
    
    var stmt2 = sqlgen.select( 'test_table', // target table
                               '*', // target columns
                               { foo: 1,
                                 bar: { '>=': 10 },
                                 buz: { '>': 100, '<': 200 },
                                 hoge: { like: '%john%' },
                                 fuga: { IN: [ 1, 2, 3 ] },
                                 moge: [ 6, 7, 8, { '!=': 9 } ]
                                 base_table_id: { IN: { sql: stmt } } // where section
                               },
                               { order: 'id' } // order section
                             );
    // it return this
    // stmt2 = { sql: 'SELECT * FROM test_table WHERE foo = $1 AND bar >= $2 AND buz > $3 AND buz < $4 AND hoge LIKE $5 AND fuga IN ( $6, $7, $8 ) AND ( moge = $9 OR moge = $10 OR moge = $11 OR moge != $12 ) AND base_table_id IN ( SELECT id FROM base_table WHERE id >= $13 ) ORDER BY id',
                values: [ 1, 10, 100, 200, '%john%', 1, 2, 3, 6, 7, 8, 9, 33 ] };

### UPDATE

    var SqlGenerator = require('sql-generator');
    var sqlgen = new SqlGenerator();
    var stmt = sqlgen.update( 'test_table', // target table
                              { id: 10 }, // where section
                              { foo: 20, bar: 30, buz: 40 } // update datas
                            );
    // it return this
    // stmt = { sql: 'UPDATE test_table SET foo = $1, bar = $2, buz = $3 WHERE id = $4',
                values: [ 20, 30, 40, 10 ] };

### DELETE

    var SqlGenerator = require('sql-generator');
    var sqlgen = new SqlGenerator();
    var stmt = sqlgen.delete( 'test_table', // target table
                              { some_flag: 1 } // where section
                            );
    // it return this
    // stmt = { sql: 'DELETE FROM test_table WHERE some_flag = $1',
                values: [ 1 ] };


## License

Copyright (c) 2011 Shota Takayama. Shanon, Inc. &lt;takayama@shanon.co.jp&gt;

The MIT License

Copyright (c) <year> <copyright holders>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.