import re
import csv
import json
import datetime
from StringIO import StringIO

from flask import url_for, current_app

from openspending.core import db
from openspending.model.dataset import Dataset
from openspending.tests.base import ControllerTestCase
from openspending.tests.helpers import (make_account, load_fixture)
from openspending.lib.helpers import get_source
from openspending.command.search import reindex as reindex_search


class TestDatasetController(ControllerTestCase):

    def setUp(self):
        super(TestDatasetController, self).setUp()
        current_app.config['LOCKDOWN_FORCE'] = False
        current_app.config['PRESERVE_CONTEXT_ON_EXCEPTION'] = False
        #self.source = csvimport_fixture("sci_study")

        self.user = make_account('test')

    def test_account_login(self):
        response = self.client.get(url_for('account.login'))
        assert '200' in response.status

    def test_account_emailmessage(self):
        response = self.client.get(url_for('account.email_message'))
        assert '200' in response.status

    def test_home_index(self):
        response = self.client.get(url_for('home.index'))
        assert '200' in response.status 

    def test_home_heartbeat(self):
        response = self.client.get(url_for('home.ping'))
        assert '200' in response.status

    def test_categories_dataorgs(self):
        response = self.client.get(url_for('categories_api2.dataorgs'))
        assert '200' in response.status 

    def test_countries_countrieslist(self):
        reindex_search()
        response = self.client.get(url_for('countries_api2.countries_list'))
        assert '200' in response.status 

    def test_dataset_dataorgs(self):
        response = self.client.get(url_for('datasets_api2.dataorgs'))
        assert '200' in response.status

    def test_dataset_datasets(self):
        response = self.client.get(url_for('datasets_api2.index'))
        assert '200' in response.status

    #### Other dataset functions need a dataset

    def test_dataview_dataviews(self):
        response = self.client.get(url_for('dataview_api2.dataviews'))
        assert '200' in response.status

    def test_references_referencedata(self):
        reindex_search()
        response = self.client.get(url_for('meta_api2.reference_data'))
        assert '200' in response.status

    def test_references_preprocessors(self):
        response = self.client.get(url_for('meta_api2.reference_preprocessors'))
        assert '200' in response.status


    def test_search_full(self):
        reindex_search()
        response = self.client.get(url_for('search_api2.search_api', q='afghan'))
        assert '200' in response.status
        assert 'afghanistan' in response.data

    # def test_index(self):
    #     response = self.client.get(url_for('dataset.index'))
    #     assert 'The database contains the following datasets' in response.data
    #     assert 'cra' in response.data

    # def test_index_json(self):
    #     response = self.client.get(url_for('dataset.index', format='json'))
    #     obj = json.loads(response.data)
    #     assert len(obj['datasets']) == 1
    #     assert obj['datasets'][0]['name'] == 'cra'
    #     assert obj['datasets'][0]['label'] == 'Country Regional Analysis v2009'

    # def test_index_hide_private(self):
    #     cra = Dataset.by_name('cra')
    #     cra.private = True
    #     db.session.commit()
    #     response = self.client.get(url_for('dataset.index', format='json'))
    #     obj = json.loads(response.data)
    #     assert len(obj['datasets']) == 0

    # def test_index_csv(self):
    #     response = self.client.get(url_for('dataset.index', format='csv'))
    #     r = csv.DictReader(StringIO(response.data))
    #     obj = [l for l in r]
    #     assert len(obj) == 1
    #     assert obj[0]['name'] == 'cra'
    #     assert obj[0]['label'] == 'Country Regional Analysis v2009'

    # def test_view(self):
    #     """
    #     Test view page for a dataset
    #     """

    #     # Get the view page for the dataset
    #     response = self.client.get(url_for('dataset.view', dataset='cra'))
    #     # The dataset label should be present in the response
    #     assert 'Country Regional Analysis v2009' in response.data, \
    #         "'Country Regional Analysis v2009' not in response!"

    #     # Assertions about time range
    #     assert 'Time range' in response.data, \
    #         'Time range is not present on view page for dataset'
    #     # Start date comes from looking at the test fixture for cra
    #     assert '1/1/03' in response.data, \
    #         'Starting date of time range not on view page for dataset'
    #     # End date comes from looking at the test fixture for cra
    #     assert '1/1/10' in response.data, \
    #         'End date of time range not on view page for dataset'

    # def test_view_private(self):
    #     cra = Dataset.by_name('cra')
    #     cra.private = True
    #     db.session.commit()
    #     response = self.client.get(url_for('dataset.view', dataset='cra'))
    #     assert '403' in response.status
    #     assert 'Country Regional Analysis v2009' not in response.data, \
    #         "'Country Regional Analysis v2009' in response!"
    #     assert 'openspending_browser' not in response.data, \
    #         "'openspending_browser' in response!"

    # def test_about_has_format_links(self):
    #     url_ = url_for('dataset.about', dataset='cra')
    #     response = self.client.get(url_)

    #     url_ = url_for('dataset.model', dataset='cra', format='json')

    #     assert url_ in response.data, \
    #         "Link to view page (JSON format) not in response!"

    # def test_about_has_profile_links(self):
    #     self.dataset.managers.append(self.user)
    #     db.session.add(self.dataset)
    #     db.session.commit()
    #     response = self.client.get(url_for('dataset.about', dataset='cra'))
    #     profile_url = url_for('account.profile', name=self.user.name)
    #     assert profile_url in response.data
    #     assert self.user.fullname in response.data.decode('utf-8')

    # def test_about_has_timestamps(self):
    #     """
    #     Test whether about page includes timestamps when dataset was created
    #     and when it was last updated
    #     """

    #     # Get the about page
    #     response = self.client.get(url_for('dataset.about', dataset='cra'))

    #     # Check assertions for timestamps
    #     assert 'Timestamps' in response.data, \
    #         'Timestamp header is not on about page'
    #     assert 'created on' in response.data, \
    #         'No line for "created on" on about page'
    #     assert 'last modified on' in response.data, \
    #         'No line for "last modified on" on about page'
    #     da = format_date(datetime.datetime.utcnow(), format='short')
    #     assert da in response.data.decode('utf-8'), \
    #         'Created (and update) timestamp is not on about page'

    # def test_view_json(self):
    #     response = self.client.get(url_for('dataset.view', dataset='cra',
    #                                        format='json'))
    #     obj = json.loads(response.data)
    #     assert obj['name'] == 'cra'
    #     assert obj['label'] == 'Country Regional Analysis v2009'

    # def test_model_json(self):
    #     response = self.client.get(url_for('dataset.model',
    #                                        dataset='cra', format='json'))
    #     obj = json.loads(response.data)
    #     assert 'dataset' in obj.keys(), obj
    #     assert obj['dataset']['name'] == 'cra'
    #     assert obj['dataset']['label'] == 'Country Regional Analysis v2009'

    # def _test_entries_json_export(self):
    #     response = self.client.get(url_for('entry.index',
    #                                 dataset='cra',
    #                                 format='json'))
    #     assert '/api/2/search' in response.headers['Location'], \
    #         response.headers
    #     assert 'format=json' in response.headers['Location'], response.headers

    # def _test_entries_csv_export(self):
    #     response = self.cliemt.get(url_for('entry.index',
    #                                 dataset='cra',
    #                                 format='csv'))
    #     assert '/api/2/search' in response.headers['Location'], \
    #         response.headers
    #     assert 'format=csv' in response.headers['Location'], response.headers
    #     response = response.follow()
    #     r = csv.DictReader(StringIO(response.body))
    #     obj = [l for l in r]
    #     assert len(obj) == 36

    # def test_new_form(self):
    #     response = self.client.get(url_for('dataset.new'),
    #                                query_string={'api_key': self.user.api_key})
    #     assert "Import a dataset" in response.data

    # def test_create_dataset(self):
    #     response = self.client.post(url_for('dataset.create'),
    #                                 query_string={'api_key': self.user.api_key})
    #     assert "Import a dataset" in response.data
    #     assert "Required" in response.data

    #     params = {'name': 'testds', 'label': 'Test Dataset',
    #               'category': 'budget', 'description': 'I\'m a banana!',
    #               'currency': 'EUR'}

    #     response = self.client.post(url_for('dataset.create'), data=params,
    #                                 query_string={'api_key': self.user.api_key})
    #     assert "302" in response.status

    #     ds = Dataset.by_name('testds')
    #     assert ds.label == params['label'], ds

    # def test_feeds(self):
    #     # Anonymous user with one public dataset
    #     response = self.client.get(url_for('dataset.feed_rss'))
    #     assert 'application/xml' in response.content_type
    #     assert '<title>Recently Created Datasets</title>' in response.data
    #     assert '<item><title>Country Regional Analysis v2009' in response.data
    #     cra = Dataset.by_name('cra')
    #     cra.private = True
    #     db.session.add(cra)
    #     db.session.commit()

    #     # Anonymous user with one private dataset
    #     response = self.client.get(url_for('dataset.feed_rss'))
    #     assert 'application/xml' in response.content_type
    #     assert '<title>Recently Created Datasets</title>' in response.data
    #     assert '<item><title>Country Regional Analysis v2009' not in response.data

    #     # Logged in user with one public dataset
    #     cra.private = False
    #     db.session.add(cra)
    #     db.session.commit()
    #     response = self.client.get(url_for('dataset.feed_rss'),
    #                                query_string={'api_key': self.user.api_key})
    #     assert 'application/xml' in response.content_type
    #     assert '<title>Recently Created Datasets</title>' in response.data
    #     assert '<item><title>Country Regional Analysis v2009' in response.data

    #     # Logged in user with one private dataset
    #     cra.private = True
    #     db.session.add(cra)
    #     db.session.commit()
    #     response = self.client.get(url_for('dataset.feed_rss'),
    #                                query_string={'api_key': self.user.api_key})
    #     assert 'application/xml' in response.content_type
    #     assert '<title>Recently Created Datasets</title>' in response.data
    #     assert '<item><title>Country Regional Analysis v2009' not in response.data

    #     # Logged in admin user with one private dataset
    #     admin_user = make_account('admin')
    #     admin_user.admin = True
    #     db.session.add(admin_user)
    #     db.session.commit()
    #     response = self.client.get(url_for('dataset.feed_rss'),
    #                                query_string={'api_key': admin_user.api_key})
    #     assert '<title>Recently Created Datasets</title>' in response.data
    #     assert '<item><title>Country Regional Analysis v2009' in response.data
    #     assert 'application/xml' in response.content_type

    #     response = self.client.get(url_for('dataset.index'))
    #     norm = re.sub('\s+', ' ', response.data)
    #     #print norm
    #     assert ('<link rel="alternate" type="application/rss+xml" title="'
    #             'Latest Datasets on OpenSpending"' in
    #             norm)
