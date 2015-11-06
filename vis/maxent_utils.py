#!/usr/bin/env python
'''
File: maxent_utils.py
Author: Hao
Description: some utility function for MaxEnt model.
'''

import numpy as np

class tile(object):
    """
    class for tile data structure.

    Data member:
            m_rows - a python list of row ids, the ids are sorted from small to
                             large.
            m_cols - a python list of column ids, the ids are sorted from small to
                             large.
    """
    def __init__(self):
        self.m_rows = []
        self.m_cols = []
    # end of constructor

    def insertRow(self, rowIDs):
        """
        insert row ids to the tile.
        """
        set_temp = set(self.m_rows) | set(rowIDs)
        self.m_rows = list(set_temp)
        self.m_rows.sort()
    # end of method insertRow

    def insertCol(self, colIDs):
        """
        insert column ids to the tile
        """
        set_temp = set(self.m_cols) | set(colIDs)
        self.m_cols = list(set_temp)
        self.m_cols.sort()
    # end of method insertCol

    def printTile(self, output_stream):
        """
        output the tile into the specific output stream
        """
        str_output = str(len(self.m_rows)) + " "
        for item in self.m_rows:
            str_output += str(item) + " "
        # end of loop for
        str_output = str_output.strip()
        output_stream.write(str_output + "\n")

        str_output = str(len(self.m_cols)) + " "
        for item in self.m_cols:
            str_output += str(item) + " "
        # end of loop for(item)
        str_output = str_output.strip()
        output_stream.write(str_output + "\n")
    # end of method printTile

    def to_list(self):
        """
        convert the tile to the format of python list.
        """
        return [[self.m_rows, self.m_cols]]
    # end of method to_list
# end of class tile

class binary_tile(tile):
    """
    class for binary tile data structure

    Additional member:
            int_density - the density of the binary tile
    """
    def __init__(self, density=0):
        super(binary_tile, self).__init__()
        self.int_density = density
    # end of constructor

    def printTile(self, output_stream):
        """
        override the method in the base class.
        """
        output_stream.write(str(self.int_density) + "\n")
        super(binary_tile, self).printTile(output_stream)
    # end of method printTile

    def to_list(self):
        """
        convert the binary tile into its python list format.
        """
        list_result = super(binary_tile, self).to_list()
        list_result.append(self.int_density)

        return list_result
    # end of method to_list
# end of class binary_tile

class mv_tile(tile):
    """
    class of real-valued tile with mean and variance as tile statistics.

    Additional data members:
            f_mean - the sum of the values in the tile
            f_variance - the sum of the squared values in the tile
    """
    def __init__(self, mean, variance):
        super(mv_tile, self).__init__()
        self.f_mean = mean
        self.f_variance = variance
    # end of constructor

    def printTile(self, output_stream):
        """
        override the method in the base class, print additional data members in
        mv_tile class.
        """
        output_stream.write(str(self.f_mean) + " " + str(self.f_variance) + "\n")
        super(mv_tile, self).printTile(output_stream)
    # end of method printTile

    def to_list(self, np_data):
        """
        convert the real-valued tile to its python list format.
        """
        list_result = super(mv_tile, self).to_list()
        list_result.append(self.f_mean)
        list_result.append(self.f_variance)
        sub_data = np_data[np.ix_(self.m_rows, self.m_cols)]
        list_result[0].append(sub_data.tolist())

        return list_result
    # end of method to_list
# end of class mv_tile

def convert2TileListEachPair(dict_transactions, set_rowID, set_colID):
    """
    Convert a bicluster over entity-entity relation to a set of tiles over
    doc-entity relation. For each entry in the entity-entity bicluster, find all
    the transactions (docs) that the two entities corresponding this entry
    appear together, and construct a tile.

    Arguments:
        dict_transactions - a python dict that contains all the transactions
                            (docs). The key of the dict is the transaction ID,
                            and the value of the dict is a python set that
                            contains the items (entities) contained in this
                            transactions.
        set_rowID - a python set that contains the row ID (entity ids) of the
                    entity-entity bicluster.
        set_colID - a python set that contains the column ID (entity ids) of the
                    entity-entity bicluster.
    Return:
        a python list of tiles that represent the given entity-entity bicluster.
    """
    list_biTiles = []

    for str_rowID in set_rowID:
        for str_colID in set_colID:
            # find related tids
            set_tids = set()
            for tid in dict_transactions.keys():
                if str_rowID in dict_transactions[tid] and str_colID in dict_transactions[tid]:
                    set_tids.add(tid)
                # end of if
            # end of loop for(tid)
            list_tids = list(set_tids)
            list_tids.sort()
            if len(list_tids) == 0:
                continue
            list_entities = [int(str_rowID), int(str_colID)]
            list_entities.sort()
            int_density = len(list_tids) * len(list_entities)
            list_tile = [[list_tids, list_entities], int_density]
            list_biTiles.append(list_tile)
        # end of loop for(str_colID)
    # end of loop for(str_rowID)

    return list_biTiles
# end of method convert2TileEachPair

def convert2TileListReal(np_data_array, set_rowID, set_colID):
    """
    Convert a bicluster over entity-entity relation to a set of tiles over
    real-valued doc-entity relation. For each entry in the entity-entity
    bicluster, find all the transactions (docs) that the two entities
    corresponding to this entry appear together, and construct a tile. The
    format of real-valued tile:
    [[[row_id1, row_id2, ...], [col_id1, col_id2, ...], value_mat], mean, var]
    where the value_mat is a python list in which each element is a python list
    representing a row of the matrix.

    Arguments:
        np_data_array - a numpy array that rows represent the transactions
                        (docs) and columns represent the items (entities). The
                        real value in entry (i,j) represent the normalized
                        number of times that item j appears in transaction i.
        set_rowID - a python set that contains the row ID (entity ids) of the
                    entity-entity bicluster.
        set_colID - a python set that contains the column ID (entity ids) of the
                    entity-entity bicluster.
    Return:
        a python list of tiles that represent the given entity-entity bicluster.
    """

    list_biTiles = []
    for str_rowID in set_rowID:
        for str_colID in set_colID:
            dict_tids_values = {}
            f_sum, f_square_sum = 0., 0.
            list_entities = [int(str_rowID), int(str_colID)]
            list_entities.sort()
            for tid in range(0, np_data_array.shape[0]):
                if np_data_array[tid, int(str_rowID)] > 0 and \
                        np_data_array[tid, int(str_colID)] > 0:
                    dict_tids_values[tid] = np_data_array[np.ix_([tid], \
                        list_entities)].flatten().tolist()
                    f_sum += np_data_array[tid, int(str_rowID)] + \
                            np_data_array[tid, int(str_colID)]
                    f_square_sum += np_data_array[tid, int(str_rowID)]**2 + \
                            np_data_array[tid, int(str_colID)]**2
                # end of if
            # end of loop for(tid)

            # construct the tile
            list_key_values = dict_tids_values.items()
            list_key_values.sort(key=lambda x:x[0])
            list_tids = [x[0] for x in list_key_values]
            value_mat = [x[1] for x in list_key_values]
            list_tile = [[list_tids, list_entities, value_mat], f_sum, \
                    f_square_sum]
            list_biTiles.append(list_tile)
        # end of loop for(str_colID)
    # end of loop for(str_rowID)

    return list_biTiles
# end of method convert2TileListReal

def compute_mean_variance(np_data, iter_rowIDs, iter_colIDs):
    """
    compute the sum and sum of square values in the given tile.

    Arguments:
            np_data - the real-valued transactional matrix
            iter_rowIDs - row IDs for the tile that could be iterated
            iter_colIDs - column IDs for the tile that could be iterated
    """
    tile_mat = np_data[np.ix_(iter_rowIDs, iter_colIDs)]
    f_sum = np.sum(tile_mat)
    f_var = np.sum(np.square(tile_mat))

    return f_sum, f_var
# end of method compute_mean_variance

def generate_rowMargin(np_data, tile_class):
    """
    generate row margin tiles from a given data matrix

    Arguments:
            np_data - numpy 2d array of the data matrix
            tile_class - the tile class used to construct tiles.
    """
    list_rowTiles = []
    list_rowIDs, list_colIDs = range(0, np_data.shape[0]), \
                    range(0, np_data.shape[1])
    for row_id in range(0, np_data.shape[0]):
        if tile_class is mv_tile:
            tile_mean, tile_var = compute_mean_variance(np_data, [row_id], \
                            list_colIDs)
            obj_tile = tile_class(tile_mean, tile_var)
        elif tile_class is binary_tile:
            tile_mat = np_data[np.ix_([row_id], list_colIDs)]
            int_num1s = np.sum(tile_mat)
            obj_tile = tile_class(int_num1s)
        # end of if
        obj_tile.insertRow([row_id])
        obj_tile.insertCol(list_colIDs)
        list_rowTiles.append(obj_tile)
    # end of loop for

    return list_rowTiles
# end of method generate_rowMargin

def generate_colMargin(np_data, tile_class):
    """
    generate column margin tiles from a give data matrix.

    Arguments:
            np_data - numpy 2d array of the data matrix
            tile_class - the tile class used to construct tiles.
    """
    list_colTiles = []
    list_rowIDs, list_colIDs = range(0, np_data.shape[0]), \
                    range(0, np_data.shape[1])
    for col_id in list_colIDs:
        if tile_class is mv_tile:
            tile_mean, tile_var = compute_mean_variance(np_data, list_rowIDs,\
                            [col_id])
            obj_tile = tile_class(tile_mean, tile_var)
        elif tile_class is binary_tile:
            tile_mat = np_data[np.ix_(list_rowIDs, [col_id])]
            int_num1s = np.sum(tile_mat)
            obj_tile = tile_class(int_num1s)
        # end of if
        obj_tile.insertRow(list_rowIDs)
        obj_tile.insertCol([col_id])
        list_colTiles.append(obj_tile)
    # end of loop for(col_id)

    return list_colTiles
# end of method generate_colMargin

def generate_cellTile(np_data, tile_class):
    """
    generate a tile for each entry in the given data matrix.

    Arguments:
            np_data - numpy 2d array of the data matrix
            tile_class - the tile class used to construct tiles.
    """
    list_cellTiles = []
    list_rowIDs, list_colIDs = range(0, np_data.shape[0]), range(0, \
                    np_data.shape[1])
    for row_id in list_rowIDs:
        for col_id in list_colIDs:
            if tile_class is mv_tile:
                tile_mean, tile_var = compute_mean_variance(np_data, [row_id], \
                                [col_id])
                obj_tile = tile_class(tile_mean, tile_var)
            elif tile_class is binary_tile:
                int_num1s = np_data[row_id, col_id]
                obj_tile = tile_class(int_num1s)
            # end of if
            obj_tile.insertRow([row_id])
            obj_tile.insertCol([col_id])
            list_cellTiles.append(obj_tile)
        # end of loop for(col_id)
    # end of loop for(row_id)

    return list_cellTiles
# end of method generate_cellTile
