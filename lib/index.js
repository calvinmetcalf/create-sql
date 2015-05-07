'use strict';
exports.select = function( tbls, columns, wheres, opt) {
  var table = genTable( tbls );
  var column = genSelectColumn( columns );
  var values = [];
  var where = genWhere( wheres, values );
  var option = genSelectOption( opt );
  var sql = 'SELECT ' + column + ' FROM ' + table;
  if(where && where.length > 0) {
    sql += ' WHERE ';
    sql += where;
  }
  if( option && option.length > 0 ) {
    sql += ' ';
    sql += option;
  }
  return { sql: sql, values: values };
};

function genSelectOption(opt) {
  if(typeof opt !== 'object' || Array.isArray(opt) ) {
    return '';
  }
  var sqls = [];
  // these code is postgresql only
  if(opt.group_by) {
    if( typeof opt.group_by === 'object' && Array.isArray(opt.group_by) ) {
      sqls.push( 'GROUP BY ' + opt.group_by.join(', ') );
    } else {
      sqls.push( 'GROUP BY ' + opt.group_by );
    }
  }
  if( opt.order ) {
    var order = '';
    if(Array.isArray(opt.order)) {
      order = opt.order.join(', ');
    } else {
      order = opt.order;
    }
    sqls.push( 'ORDER BY ' + order );
  }
  if( opt.limit && typeof opt.limit === 'number' ) {
    sqls.push( 'LIMIT ' + opt.limit );
  }
  if( opt.offset && typeof opt.offset === 'number' ) {
    sqls.push( 'OFFSET ' + opt.offset );
  }
  return sqls.join(' ');
}

function genWhere( tmpWhere, values ) {
  var where;
  if(!tmpWhere ) {
    return where;
  }
  var ws = [];
  where = JSON.parse( JSON.stringify( tmpWhere ) );
  if( Array.isArray(where) ) {
    for( var i = 0; i < where.length; i++ ) {
      ws.push( recurseWhere( values, where[i] ) );
    }
    return ws.join(' OR ');
  }
  if( typeof where === 'object' ) {
    for( var key in where ) {
      ws.push( recurseWhere( values, where[key], key ) );
    }
    return ws.join(' AND ');
  }
  return where;
}

function recurseWhere( values, where, key, bop, jk ) {
  if( !bop ) {
    bop = '=';
  }
  if( !jk ) {
    jk = 'AND';
  }
  var vs = [];
  var ws = [];
  var i;
  var aryFn;
  var aryOp;
  var tmpValues = [];
  if( key && key.toLowerCase() === '-or' ) {
    if( Array.isArray(where) ) {
      where.forEach( function( w ) {
        vs.push( recurseWhere( values, w, key, bop, 'OR' ) );
      } );
    } else if( typeof where === 'object' ) {
      Object.keys( where ).forEach( function( w ) {
        var tmph = {};
        tmph[ w ] = where[ w ];
        vs.push( recurseWhere( values, tmph, null, bop, 'OR' ) );
      } );
    }
    return '(' + vs.join(' OR ') + ')';
  }
  if( Array.isArray(where) ) {
    for( i = 0; i < where.length; i++ ) {
      vs.push( recurseWhere( values, where[i], key, bop, jk ) );
    }
    return '( ' + vs.join(' OR ') + ' )';
  }
  if( ( where === null || where === undefined ) && key ) {
    if( bop === '=' ) {
      return key + ' IS NULL';
    } else {
      return key + ' ' + bop + ' NULL';
    }
  }
  if( typeof where !== 'object' ) {
    values.push( where );
    return key + ' ' + bop + ' $' + values.length;
  }
  var eachFunc = function( w ) {
    vs.push( recurseWhere( values, w, key, bop, jk ) );
  };
  for( var op in where ) {
    //console.log( '+++', { ws: ws, op: op, key:key, 'where[op]': where[op] } );
    if( op.toLowerCase() === '-and' ) {
      where[op].forEach(eachFunc);
      return '(' + vs.join(' AND ') + ')';
    } else if( ['=', '!=', '>', '>=', '<', '<='].indexOf( op.toLowerCase() ) !== -1 ) {
      ws.push( recurseWhere( values, where[op], key, op, jk ) );
    } else if( op.toLowerCase() === 'in' ) {
      if( typeof where[op] === 'object'
        && typeof where[op].sql === 'object'
        && where[op].sql.sql && where[op].sql.values ) {
        var sql = where[op].sql.sql;

        for( i = where[op].sql.values.length - 1; i >= 0; i-- ) {
          tmpValues.unshift( where[op].sql.values[i] );
          var newSql = sql.replace( '\$' + ( i + 1 ), '$' + ( values.length + i + 1 ) );
          sql = newSql;
        }
        for(i = 0; i < tmpValues.length; i++ ) {
          values.push( tmpValues[i] );
        }
        ws.push( key + ' IN ( ' + sql + ' )' );
      } else if( typeof where[op] === 'string' && where[op].match('^(SELECT|select)') ) {
        ws.push( key + ' IN ( ' + where[op] + ' ) ' );
      } else {
        for(i = 0; i < where[op].length; i++ ) {
          values.push( where[op][i] );
          vs.push( '$' + values.length );
        }
        ws.push( key + ' IN ( ' + vs.join(', ') + ' )');
      }
    } else if( op.toLowerCase() === 'array' ) {
      if( typeof where[op] !== 'object' ) {
        where[op] = { ANY: where[op] };
      }

      var sec;
      var flag = false;
      if( typeof where[op] === 'object' ) {
        for( var aryKey in where[op] ) {
          if( aryKey.toLowerCase().match( /(any|all)$/ ) ) {
            aryFn = RegExp.$1.toUpperCase();
            if( aryKey.match( /^(!=|>=|<=|>|<|=) / ) ) {
              aryOp = RegExp.$1;
            } else {
              aryOp = '=';
            }
            sec = where[op][aryKey];
            flag = true;
            break;
          }
        }
      }
      if( !flag ) {
        aryFn = 'ANY';
        aryOp = '=';
        sec = where[op];
      }
      if( typeof sec.sql === 'object'
        && sec.sql.sql && sec.sql.values ) {
        sql = sec.sql.sql;
        for( i = sec.sql.values.length - 1; i >= 0; i-- ) {
          tmpValues.unshift( sec.sql.values[i] );
          newSql = sql.replace( '\$' + ( i + 1 ), '$' + ( values.length + i + 1 ) );
          sql = newSql;
        }
        for(i = 0; i < tmpValues.length; i++ ) {
          values.push( tmpValues[i] );
        }
        ws.push( '(' + sql + ') ' + aryOp + ' ' + aryFn + '(' + key + ')' );
      } else if( typeof sec === 'string' && sec.match('^(SELECT|select)') ) {
        ws.push( '(' + sec + ') ' + aryOp + ' ' + aryFn + '(' + key + ')' );
      } else if( Array.isArray(sec) ) {
        var j = -1;
        var v;
        while (++j < sec.length) {
          v = sec[j];
          values.push( v );
          vs.push( '$' + values.length + ' ' + aryOp + ' ' + aryFn + '(' + key + ')' );
        }
        ws.push( '(' + vs.join(' OR ') + ')' );
      } else {
        values.push( sec );
        ws.push( '$' + values.length + ' ' + aryOp + ' ' + aryFn + '(' + key + ')' );
      }
    } else if( key ) {
      if( Array.isArray(where[op]) ) {
        ws.push( recurseWhere( values, where[op], key, op, jk ) );
      } else {
        ws.push( recurseWhere( values, where[op], key, op, jk ) );
      }
    } else {
      ws.push( recurseWhere( values, where[op], op, bop, jk ) );
    }
  }
  return ws.join(' ' + jk + ' ');
}
function genSelectColumn( columns ) {
  var column = '';
  var cols = [];
  var key;
  if( Array.isArray(columns) ) {
    for( var i = 0; i < columns.length; i++ ) {
      if( typeof columns[i] === 'object' ) {
        for(key in columns[i] )
          cols.push( key + ' AS ' + columns[i][key] );
      } else {
        cols.push( columns[i] );
      }
    }
    column = cols.join(', ');
  } else if( typeof columns === 'object' ) {
    for( key in columns )
      cols.push( key + ' AS ' + columns[key] );
    column = cols.join(', ');
  } else {
    column = columns;
  }
  if( typeof column === 'undefined' || column.length < 1 ) {
    column = '*';
  }
  return column;
}
function genTable( table ) {
  var t = [];
  if( Array.isArray(table) ) {
    for( var i = 0; i < table.length; i++ ) {
      if( typeof table[i] === 'object' ) {
        for( var k in table[i] )
          t.push( k + ' AS ' + table[i][k] );
      } else {
        t.push( table[i] );
      }
    }
    return t.join(', ');
  }
  return table;
}
exports.insert = function( table, data ) {
  var keys = [];
  var values = [];
  var pvalues = [];
  Object.keys(data).forEach(function (key) {
    keys.push( key );
    if(Array.isArray(data[key]) ) {
      var isNum = true;
      for( var i = 0; i < data[key].length; i++ ) {
        if( typeof data[key][i] !== 'number' ) {
          isNum = false;
          break;
        }
      }
      if( isNum ) {
        values.push( '{' + data[key].join(',') + '}' );
        pvalues.push( '$' + values.length );
      } else {
        var aryVs = [];
        data[key].forEach( function( v ) {
          values.push( v );
          aryVs.push( '$' + values.length );
        } );
        pvalues.push( 'ARRAY[' + aryVs.join(', ') + ']' );
      }
    } else {
      values.push( data[key] );
      pvalues.push( '$' + values.length );
    }
  });
  var sql = 'INSERT INTO ' + table + ' ( ' + keys.join(', ') + ' ) VALUES ( ' + pvalues.join(', ') + ' )';
  return { sql: sql, values: values };
};
exports.update = function( table, wheres, data ) {
  var kvs = [];
  var values = [];
  Object.keys(data).forEach(function (key) {
    if( typeof data[key] === 'object' && Array.isArray(data[key]) ) {
      var isNum = true;
      for( var i = 0; i < data[key].length; i++ ) {
        if( typeof data[key][i] !== 'number' ) {
          isNum = false;
          break;
        }
      }
      if( isNum ) {
        values.push( '{' + data[key].join(',') + '}' );
        kvs.push( key + ' = $' + values.length );
      } else {
        var aryVs = [];
        data[key].forEach( function( v ) {
          values.push( v );
          aryVs.push( '$' + values.length );
        } );
        kvs.push( key + ' = ARRAY[' + aryVs.join(', ') + ']' );
      }
    } else {
      values.push( data[key] );
      kvs.push( key + ' = $' + values.length );
    }
  });
  var where = genWhere( wheres, values );
  var sql = 'UPDATE ' + table + ' SET ' + kvs.join(', ');
  if( where && where.length > 0 ) {
    sql += ' WHERE ' + where;
  }
  return { sql: sql, values: values };
};
exports.delete = function( table, wheres ) {
  //console.log( sys.inspect( { table: table, where: wheres } ) );
  var values = [];
  var where = genWhere( wheres, values );
  var sql = 'DELETE FROM ' + table;
  if( where && where.length > 0 ) {
    sql += ' WHERE ' + where;
  }
  return { sql: sql, values: values };
};
