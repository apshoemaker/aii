import pytest


def test_graph_compiles():
    """The LangGraph agent should compile without errors."""
    from graph import build_graph
    graph = build_graph()
    assert graph is not None


def test_graph_has_expected_nodes():
    """Graph should have agent and tools nodes."""
    from graph import build_graph
    graph = build_graph()
    node_names = set(graph.nodes.keys())
    assert "agent" in node_names
    assert "tools" in node_names
