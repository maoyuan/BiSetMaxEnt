BiSetMaxEnt
=========

A visual analytics tool with biclusters

Installation for Wiki function:

Install boto:

		$ git clone git://github.com/boto/boto.git
        $ cd boto
        $ python setup.py install

Install wikipedia for python:

		$ pip install wikipedia


Include MaxEnt model to evaluate bicluster, the evaluation
is based on the "surpriseness" of the information in each
bicluster. The model would dynamically update as a user
select a bicluster.