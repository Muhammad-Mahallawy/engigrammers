import pytest
from fastapi import HTTPException

from app.main import compare_experiments, get_experiment, health, list_experiments

def test_health():
    assert health()['records_loaded'] == 56

def test_sibal_filter_returns_31():
    assert list_experiments(
        material='SIBAL',
        min_oxygen=None,
        max_oxygen=None,
        min_initial_flow=None,
        max_initial_flow=None,
        limit=100,
        offset=0,
    )['total'] == 31

def test_flow_change_is_calculated():
    body = get_experiment('GMT45-T4')
    assert body['flow_change_cm_s'] == -7.8
    assert body['outcome'] == 'quenched_low_flow'

def test_comparison():
    body = compare_experiments(test_a='GMT45-T4', test_b='GMT45-T15')
    assert body['difference_b_minus_a']['flow_final_cm_s'] == 26.8
    assert body['comparison_context']['same_material'] is True

def test_missing_test_is_404():
    with pytest.raises(HTTPException) as error:
        get_experiment('not-a-test')
    assert error.value.status_code == 404
