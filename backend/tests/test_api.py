from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['records_loaded'] == 56

def test_sibal_filter_returns_31():
    response = client.get('/api/experiments', params={'material': 'SIBAL'})
    assert response.status_code == 200
    assert response.json()['total'] == 31

def test_flow_change_is_calculated():
    response = client.get('/api/experiments/GMT45-T4')
    assert response.status_code == 200
    body = response.json()
    assert body['flow_change_cm_s'] == -7.8
    assert body['outcome'] == 'quenched_low_flow'

def test_comparison():
    response = client.get('/api/compare', params={'test_a': 'GMT45-T4', 'test_b': 'GMT45-T15'})
    assert response.status_code == 200
    body = response.json()
    assert body['difference_b_minus_a']['flow_final_cm_s'] == 26.8
    assert body['comparison_context']['same_material'] is True

def test_missing_test_is_404():
    assert client.get('/api/experiments/not-a-test').status_code == 404
